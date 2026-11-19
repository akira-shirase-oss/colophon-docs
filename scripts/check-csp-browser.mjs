#!/usr/bin/env node
// The built site under the content security policy it will be served with (dist/_headers, applied
// by scripts/lib/serve-dist.mjs as Cloudflare Pages applies it): every page loads with zero policy
// violations, and every JSON-LD block parses with the types the Head override writes. The check
// proves it can fail first: a fixture page under the same policy, with one executable inline script
// that has no hash beside a JSON-LD block, must report exactly one violation (the script, never the
// data) and the script must not run.
//
//   node scripts/check-csp-browser.mjs            (after `npm run build`)
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from './lib/serve-dist.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;
const problems = [];

const browser = await chromium.launch();
const context = await browser.newContext();
await context.addInitScript(() => {
	window.__violations = [];
	document.addEventListener('securitypolicyviolation', (event) => {
		window.__violations.push({ directive: event.violatedDirective, blocked: event.blockedURI || 'inline', source: event.sourceFile || '' });
	});
});

async function visit(base, path) {
	const page = await context.newPage();
	const response = await page.goto(base + path, { waitUntil: 'load' });
	await page.waitForTimeout(150);
	const result = await page.evaluate(() => ({
		violations: window.__violations,
		ran: window.__badScriptRan === true,
		jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((block) => {
			try {
				return JSON.parse(block.textContent)['@type'];
			} catch {
				return '(unparseable)';
			}
		}),
	}));
	await page.close();
	return { status: response.status(), ...result };
}

// 1. The known-bad fixture fails: one violation, from the unhashed script only.
const fixtureDir = mkdtempSync(join(tmpdir(), 'csp-fixture-'));
copyFileSync(join(dist, '_headers'), join(fixtureDir, '_headers'));
writeFileSync(
	join(fixtureDir, 'index.html'),
	'<!doctype html><html lang="en"><head><title>fixture</title>' +
		'<script type="application/ld+json">{"@context":"https://schema.org","@type":"Thing","name":"data"}</script>' +
		'</head><body><script>window.__badScriptRan = true</script></body></html>',
);
const fixture = await serveDist(fixtureDir);
const bad = await visit(fixture.base, '/');
await fixture.close();
rmSync(fixtureDir, { recursive: true, force: true });
if (bad.violations.length !== 1 || !bad.violations[0].directive.startsWith('script-src')) problems.push(`the known-bad fixture reported ${JSON.stringify(bad.violations)}; expected exactly one script-src violation`);
if (bad.ran) problems.push('the known-bad fixture ran an inline script that has no hash');
if (bad.jsonLd.join() !== 'Thing') problems.push(`the fixture's JSON-LD read as ${JSON.stringify(bad.jsonLd)}`);

// 2. Every real page: zero violations, and the expected structured data. One known exception, the
// same in production before this check existed: the API reference's renderer (Scalar) tries eval()
// once in one of its chunks; the policy blocks it, as it should, and the reference renders without
// it. Only that exact violation is accepted, on that page only; the policy is never loosened for it.
const knownScalarEval = (v) => v.directive === 'script-src' && v.blocked === 'eval' && new URL(v.source || 'about:blank', 'http://x').pathname.startsWith('/scalar/');
// 2. Every real page: zero violations, and the expected structured data.
const site = await serveDist(dist);
const sitemap = await (await fetch(`${site.base}/sitemap-0.xml`)).text();
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (!paths.includes('/api/reference/')) paths.push('/api/reference/');
let blocks = 0;
for (const path of paths) {
	const result = await visit(site.base, path);
	if (result.status !== 200) problems.push(`${path}: HTTP ${result.status}`);
	const unexpected = result.violations.filter((v) => !(path === '/api/reference/' && knownScalarEval(v)));
	if (unexpected.length > 0) problems.push(`${path}: ${unexpected.length} policy violation(s): ${JSON.stringify(unexpected.slice(0, 3))}`);
	const expected = path === '/' ? ['WebSite'] : path === '/api/reference/' ? [] : ['BreadcrumbList', 'TechArticle'];
	if (result.jsonLd.join() !== expected.join()) problems.push(`${path}: JSON-LD ${JSON.stringify(result.jsonLd)}, expected ${JSON.stringify(expected)}`);
	blocks += result.jsonLd.length;
}
await site.close();
await browser.close();

if (problems.length > 0) {
	console.error(`check-csp-browser: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
	process.exit(1);
}
console.log(`check-csp-browser: the known-bad fixture failed as it must (1 violation, script blocked, JSON-LD read); ${paths.length} pages under dist/_headers: no violations but the known one, ${blocks} JSON-LD blocks parsed with the expected types`);
