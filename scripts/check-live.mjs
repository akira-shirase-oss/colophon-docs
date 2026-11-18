#!/usr/bin/env node
// After a deploy: the things only a real browser on the real host shows. Search answers (its
// WebAssembly runs under the site's content security policy), the API reference renders its
// operations, every page in the list loads with no console error, and a phone-width page doesn't
// scroll sideways.
//
//   node scripts/check-live.mjs https://docs.colophon.404human.dev
import { chromium } from 'playwright';

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
	if (directive('connect-src').includes('https:') !== otherHosts) problems.push(`${path}: connect-src is "${directive('connect-src')}"`);
	if (directive('frame-ancestors') !== "frame-ancestors 'none'") problems.push(`${path}: frame-ancestors is not 'none'`);
	if (!/max-age=\d{8,}/.test(headers.get('strict-transport-security') ?? '')) problems.push(`${path}: no HSTS`);
	if (headers.get('x-content-type-options') !== 'nosniff') problems.push(`${path}: no nosniff`);
	if (!headers.get('referrer-policy')) problems.push(`${path}: no Referrer-Policy`);
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

const phone = await browser.newPage({ viewport: { width: 360, height: 780 } });
for (const path of pages) {
	await phone.goto(base + path);
	const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	if (overflow > 0) problems.push(`${path} scrolls sideways by ${overflow}px at 360px`);
}
await browser.close();

if (problems.length > 0) {
	console.error(`check-live: ${problems.length} problem(s) on ${base}\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
	process.exit(1);
}
console.log(`check-live: security headers right; ${pages.length} pages load, search answers (${results} results), the reference renders, nothing scrolls sideways at 360px`);
