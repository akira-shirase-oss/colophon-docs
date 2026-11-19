#!/usr/bin/env node
// After a deploy: the things only a real browser on the real host shows. Search answers (its
// WebAssembly runs under the site's content security policy), the API reference renders its
// operations, every page in the list loads with no console error, a phone-width page doesn't
// scroll sideways, and every page passes the accessibility scan (scripts/axe-scan.mjs) at 1440 and
// 360, light and dark, without JavaScript, settled, and with a changelog card open.
//
//   node scripts/check-live.mjs https://docs.colophon.404human.dev
import { chromium } from 'playwright';
import { describe, scanSite } from './axe-scan.mjs';
import { ANALYTICS_REPORT_ORIGIN, ANALYTICS_SCRIPT_ORIGIN } from './lib/third-parties.mjs';

const base = (process.argv[2] ?? 'https://docs.colophon.404human.dev').replace(/\/$/, '');
const pages = ['/', '/quick-start/', '/installation/', '/concepts/', '/api/', '/api/authentication/', '/api/delivery/', '/api/management/', '/changelog/'];
const problems = [];

// The security headers, as the host serves them: no inline script but the site's own (by hash),
// only the API reference may connect to other hosts, no framing, HSTS, nosniff, a referrer policy.
for (const [path, otherHosts] of [['/', false], ['/quick-start/', false], ['/api/reference/', true]]) {
	const headers = (await fetch(base + path, { method: 'HEAD' })).headers;
	const policy = headers.get('content-security-policy') ?? '';
	const directive = (name) => policy.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';
	if (directive('script-src').includes("'unsafe-inline'") || directive('script-src').includes("'unsafe-eval'")) problems.push(`${path}: script-src allows inline or eval`);
	if (!directive('script-src').includes("'sha256-")) problems.push(`${path}: script-src has no hashes`);
	// connect-src: this site and the analytics report origin only; the API reference also any https
	// server (Test Request). script-src: this site, hashes, and the analytics script origin.
	const connect = directive('connect-src').split(/\s+/).slice(1);
	if (connect.includes('https:') !== otherHosts || (!otherHosts && connect.join(' ') !== `'self' ${ANALYTICS_REPORT_ORIGIN}`)) problems.push(`${path}: connect-src is "${directive('connect-src')}"`);
	if (!directive('script-src').split(/\s+/).includes(ANALYTICS_SCRIPT_ORIGIN)) problems.push(`${path}: script-src doesn't allow ${ANALYTICS_SCRIPT_ORIGIN}`);
	if (directive('frame-ancestors') !== "frame-ancestors 'none'") problems.push(`${path}: frame-ancestors is not 'none'`);
	if (!/max-age=\d{8,}/.test(headers.get('strict-transport-security') ?? '')) problems.push(`${path}: no HSTS`);
	if (headers.get('x-content-type-options') !== 'nosniff') problems.push(`${path}: no nosniff`);
	if (!headers.get('referrer-policy')) problems.push(`${path}: no Referrer-Policy`);
}
// Search engines: each Markdown copy names its page as canonical; the pages carry their structured
// data; and nothing on the host rewrites page text (Cloudflare's email obfuscation turned address-like
// strings in code samples into "[email protected]").
{
	const link = (await fetch(`${base}/quick-start.md`, { method: 'HEAD' })).headers.get('link') ?? '';
	if (link !== `<${base}/quick-start/>; rel="canonical"`) problems.push(`/quick-start.md: Link is "${link}"`);
	for (const [path, types] of [['/', 'WebSite'], ['/quick-start/', 'BreadcrumbList,TechArticle'], ['/cli/', 'BreadcrumbList,TechArticle']]) {
		const html = await (await fetch(base + path)).text();
		const found = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, body]) => {
			try {
				return JSON.parse(body)['@type'];
			} catch {
				return '(unparseable)';
			}
		});
		if (found.join() !== types) problems.push(`${path}: JSON-LD types are [${found}], expected [${types}]`);
		if (html.includes('/cdn-cgi/l/email-protection')) problems.push(`${path}: the host rewrote an address in the page (Cloudflare email obfuscation is on)`);
	}
}

const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
page.on('pageerror', (error) => errors.push(String(error)));
for (const path of pages) {
	const response = await page.goto(base + path);
	if (!response?.ok()) problems.push(`${path} answered ${response?.status()}`);
}
await page.goto(`${base}/`);
await page.getByRole('button', { name: /Search/ }).first().click();
// Pagefind's input mounts a moment after the dialog opens.
await page.locator('.pagefind-ui__search-input').fill('Idempotency-Key');
await page.locator('.pagefind-ui__result').first().waitFor({ timeout: 10000 }).catch(() => {});
const results = await page.locator('.pagefind-ui__result').count();
if (results === 0) problems.push('search found nothing for "Idempotency-Key"');
await page.goto(`${base}/api/reference/`);
await page.waitForTimeout(4000);
const operations = await page.locator('text=/livez').count();
if (operations === 0) problems.push('the API reference rendered no operations');
if (errors.length > 0) problems.push(`console errors: ${errors.slice(0, 3).join(' | ')}`);

// The changelog's cards: an entry's #anchor opens it; Enter toggles a card and Esc closes it; the
// state is the button's aria-expanded, and the body is shown exactly when it says true.
{
	const changelog = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await changelog.goto(`${base}/changelog/`);
	const anchor = await changelog.locator('article.change').first().getAttribute('id');
	await changelog.goto(`${base}/changelog/#${anchor}`);
	await changelog.waitForTimeout(300);
	const card = (id) => changelog.locator(`[id="${id}"] .change-toggle`);
	if ((await card(anchor).getAttribute('aria-expanded')) !== 'true') problems.push(`/changelog/#${anchor} didn't open the entry`);
	const second = changelog.locator('article.change .change-toggle').nth(1);
	const body = changelog.locator(`[id="${await second.getAttribute('aria-controls')}"]`);
	if ((await second.getAttribute('aria-expanded')) !== 'false' || (await body.isVisible())) problems.push('a changelog card is open before anyone opened it');
	await second.focus();
	await changelog.keyboard.press('Enter');
	if ((await second.getAttribute('aria-expanded')) !== 'true' || !(await body.isVisible())) problems.push("Enter didn't open a changelog card");
	await changelog.keyboard.press('Escape');
	if ((await second.getAttribute('aria-expanded')) !== 'false' || (await body.isVisible())) problems.push("Esc didn't close the open changelog card");
	await changelog.close();
}

const phone = await browser.newPage({ viewport: { width: 360, height: 780 } });
for (const path of pages) {
	await phone.goto(base + path);
	const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	if (overflow > 0) problems.push(`${path} scrolls sideways by ${overflow}px at 360px`);
}
const scans = await scanSite(browser, base, pages);
for (const row of scans.filter((row) => !row.ok)) problems.push(`axe: ${describe(row)}`);
await browser.close();

if (problems.length > 0) {
	console.error(`check-live: ${problems.length} problem(s) on ${base}\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
	process.exit(1);
}
console.log(`check-live: security headers right; ${pages.length} pages load, search answers (${results} results), the reference renders, nothing scrolls sideways at 360px, ${scans.length} accessibility scans clean`);
