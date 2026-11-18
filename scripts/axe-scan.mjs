// One accessibility scan for every check that runs one: check-live, review runs, the tests.
// axe-core is pinned in package.json; the rule tags are pinned here. A scan fails on any
// serious or critical violation.
//
// A page is scanned in the states a reader can meet it in, each asserted before the scan so a
// scan never runs on a half-loaded page:
// - `no-js`: the page as served with every script removed, the state a reader without
//   JavaScript gets (the changelog shows every entry in full there);
// - `js`: scripts on, once the page has settled (the changelog: every card collapsed);
// - `js-expanded`: scripts on, one changelog card opened by its button, asserted open.
//
//   node scripts/axe-scan.mjs <base> [path ...]   scans each path at 1440 and 360, light and dark
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** The WCAG tags every scan runs, and nothing else. */
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** The impacts that fail a scan. */
export const FAILING = ['serious', 'critical'];

/** axe's failing violations on the page as it is now, as `rule(count)` strings plus detail. */
export async function axeOn(page) {
	await page.evaluate(axeSource);
	return page.evaluate(
		async ({ tags, failing }) => {
			const result = await window.axe.run(document, { runOnly: tags, resultTypes: ['violations'] });
			return result.violations
				.filter((violation) => failing.includes(violation.impact))
				.map((violation) => ({
					rule: violation.id,
					impact: violation.impact,
					count: violation.nodes.length,
					first: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
				}));
		},
		{ tags: TAGS, failing: FAILING },
	);
}

/** Removes every script from an HTML document: what a reader without JavaScript runs. */
export function withoutScripts(html) {
	return html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<script\b[^>]*\/>/gi, '');
}

/**
 * Opens `url` in `state` on a fresh page of `context` and scans it. Answers
 * `{state, violations, problem}`, where `problem` says why the state couldn't be reached.
 */
export async function scanState(context, url, state) {
	const page = await context.newPage();
	try {
		if (state === 'no-js') {
			// Scripts are stripped from the document and refused as files, so the page renders as
			// it does without JavaScript; axe itself is evaluated by the harness, not the page.
			await page.route('**/*', async (route) => {
				const request = route.request();
				if (request.resourceType() === 'script') return route.abort();
				if (request.resourceType() === 'document') {
					const response = await route.fetch();
					const headers = { ...response.headers() };
					delete headers['content-security-policy'];
					return route.fulfill({ response, headers, body: withoutScripts(await response.text()) });
				}
				return route.continue();
			});
		}
		await page.goto(url, { waitUntil: 'networkidle' });
		const cards = page.locator('article.change .change-toggle');
		const isChangelog = (await cards.count()) > 0;
		if (state === 'no-js' && isChangelog) {
			// Without the script every body is shown: the scan must see them.
			const hidden = await page.locator('article.change .change-body[hidden]').count();
			if (hidden > 0) return { state, violations: [], problem: `${hidden} card bodies hidden without JavaScript` };
		}
		if (state === 'js' && isChangelog) {
			await page.waitForFunction(() => document.querySelectorAll('.change-toggle[aria-expanded="true"]').length === 0 || location.hash.length > 1);
		}
		if (state === 'js-expanded') {
			if (!isChangelog) return { state, violations: [], problem: 'no changelog card to expand' };
			const toggle = cards.nth(1);
			await toggle.click();
			const body = page.locator(`[id="${await toggle.getAttribute('aria-controls')}"]`);
			if ((await toggle.getAttribute('aria-expanded')) !== 'true' || !(await body.isVisible())) {
				return { state, violations: [], problem: 'the card did not open' };
			}
		}
		return { state, violations: await axeOn(page), problem: null };
	} finally {
		await page.close();
	}
}

/** The states a path is scanned in: the changelog has an expanded one too. */
export const statesFor = (path) => (path.startsWith('/changelog') ? ['no-js', 'js', 'js-expanded'] : ['no-js', 'js']);

/**
 * Scans `paths` under `base` at 1440 and 360, light and dark, in each of their states. Answers
 * one row per scan; a row fails when it has violations or a problem.
 */
export async function scanSite(browser, base, paths) {
	const rows = [];
	for (const width of [1440, 360]) {
		for (const theme of ['light', 'dark']) {
			const context = await browser.newContext({ viewport: { width, height: width === 360 ? 780 : 900 }, colorScheme: theme });
			await context.addInitScript((value) => {
				try {
					localStorage.setItem('starlight-theme', value);
				} catch {}
			}, theme);
			for (const path of paths) {
				for (const state of statesFor(path)) {
					const result = await scanState(context, base + path, state);
					rows.push({ path, width, theme, ...result, ok: result.violations.length === 0 && !result.problem });
				}
			}
			await context.close();
		}
	}
	return rows;
}

/** One line per failing row, for a report. */
export const describe = (row) =>
	`${row.path} ${row.width} ${row.theme} ${row.state}: ${row.problem ?? row.violations.map((v) => `${v.rule}(${v.count}) at ${v.first.join(', ')}`).join('; ')}`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { chromium } = await import('playwright');
	const base = (process.argv[2] ?? '').replace(/\/$/, '');
	if (!base) {
		console.error('usage: node scripts/axe-scan.mjs <base> [path ...]');
		process.exit(2);
	}
	const paths = process.argv.length > 3 ? process.argv.slice(3) : ['/changelog/'];
	const browser = await chromium.launch();
	const rows = await scanSite(browser, base, paths);
	await browser.close();
	for (const row of rows) console.log(`${row.ok ? 'ok  ' : 'FAIL'} ${row.ok ? `${row.path} ${row.width} ${row.theme} ${row.state}` : describe(row)}`);
	const failed = rows.filter((row) => !row.ok).length;
	console.log(`axe (${TAGS.join(', ')}; failing on ${FAILING.join('/')}): ${rows.length - failed}/${rows.length} scans clean`);
	process.exit(failed ? 1 : 0);
}
