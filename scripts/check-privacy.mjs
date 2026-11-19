#!/usr/bin/env node
// What the built site sends, and to whom. Opens every page in a real browser and records every
// request; the only hosts allowed are the site itself and the exact allowlist in
// scripts/lib/third-parties.mjs (Cloudflare Web Analytics' two hosts, which Cloudflare adds in
// production only). Any other host fails; scripts/seo.test.mjs proves a third origin does. Then, on the API reference, sends a request
// with a token through "Test Request" to a stub server of our own and proves that:
//   - the request went straight to that server (no proxy.scalar.com or any other host),
//   - the token is not left in localStorage or sessionStorage after a reload,
//   - nothing else (telemetry, fonts, AI) was contacted.
//
//   node scripts/check-privacy.mjs --base http://127.0.0.1:4321 [--stub-port 58152]
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { foreignHosts } from './lib/third-parties.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const base = option('base', 'http://127.0.0.1:4321').replace(/\/$/, '');
const stubPort = Number(option('stub-port', '58152'));
const stub = `http://127.0.0.1:${stubPort}`;
const token = 'colophon_privacycheck_0123456789abcdef';
const problems = [];

// A stand-in for the reader's Colophon: it records what reaches it and answers like /livez does.
const received = [];
const server = createServer((request, response) => {
	received.push({ method: request.method, url: request.url, authorization: request.headers.authorization ?? null });
	response.writeHead(200, {
		'content-type': 'application/json',
		'access-control-allow-origin': '*',
		'access-control-allow-headers': 'authorization, content-type, accept',
		'access-control-allow-methods': '*',
	});
	response.end('{"status":"ok"}');
});
await new Promise((resolve) => server.listen(stubPort, '127.0.0.1', resolve));

// Every page the sitemap lists.
const sitemapXml = await (await fetch(`${base}/sitemap-0.xml`)).text();
const paths = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (!paths.includes('/api/reference/')) paths.push('/api/reference/');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const hosts = new Map(); // host -> pages that contacted it
let current = '';
const sentToStub = [];
context.on('request', (request) => {
	if (request.url().startsWith(stub)) sentToStub.push({ method: request.method(), url: request.url(), authorization: request.headers().authorization ?? null });
	const url = new URL(request.url());
	if (url.protocol === 'data:' || url.protocol === 'blob:') return;
	const host = url.host;
	if (!hosts.has(host)) hosts.set(host, new Set());
	hosts.get(host).add(current);
});
const page = await context.newPage();
for (const path of paths) {
	current = path;
	await page.goto(base + path, { waitUntil: 'networkidle' });
}

// Try-it on the reference: first at the local stub, then at a remote https server, which is where a
// proxy would show (a client may skip its proxy for local addresses only). The remote one is answered
// inside the browser, so nothing leaves this machine; the request log shows where it was addressed.
const remote = 'https://cms.example.com';
let target = stub;
current = '/api/reference/ (try-it)';
await page.route(`${base}/api/reference/`, async (route) => {
	const response = await route.fetch();
	const body = (await response.text()).replaceAll('https://cms.example.com', target);
	// The page's inline scripts are allowed by hash, so the edited one needs its new hash: the policy
	// stays enforced, with exactly this page's scripts allowed.
	const headers = { ...response.headers() };
	const policy = headers['content-security-policy'];
	if (policy) {
		const hashes = [...body.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
			([, script]) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
		);
		headers['content-security-policy'] = policy.replace(/script-src [^;]*/, (directive) =>
			directive.includes("'sha256-") ? `${directive.replace(/ 'sha256-[^']+'/g, '')} ${hashes.join(' ')}` : directive,
		);
	}
	await route.fulfill({ response, body, headers });
});
async function tryIt() {
	await page.goto(`${base}/api/reference/`, { waitUntil: 'networkidle' });
	const testButton = page.locator('button:has-text("Test Request")').first();
	await testButton.scrollIntoViewIfNeeded();
	await testButton.click();
	const client = page.locator('.scalar-client, [role="dialog"]').last();
	await client.waitFor();
	// The token field of the bearer scheme.
	await client.getByPlaceholder(/token/i).first().fill(token);
	await page.waitForTimeout(300);
	await client.getByRole('button', { name: /^Send/i }).first().click();
	await page.waitForTimeout(2500);
}
await tryIt();
// The browser's own network log is the proof of where the request went (the stub may not see it if
// the browser refuses the cross-origin answer first).
const hit = sentToStub.find((r) => r.authorization === `Bearer ${token}`);
if (!hit) problems.push(`try-it did not send the token to the configured server (browser sent ${JSON.stringify(sentToStub)})`);

const storageHolds = async () =>
	page.evaluate((t) => {
		const all = (s) => Array.from({ length: s.length }, (_, i) => `${s.key(i)}=${s.getItem(s.key(i))}`).join('\n');
		return { local: all(localStorage).includes(t), session: all(sessionStorage).includes(t) };
	}, token);
const before = await storageHolds();
await page.reload({ waitUntil: 'networkidle' });
const after = await storageHolds();
if (after.local || after.session) problems.push(`the token is in ${after.local ? 'localStorage' : 'sessionStorage'} after a reload`);

// The remote server. Anything else off this site is refused before it leaves the browser.
const sentToRemote = [];
page.on('request', (request) => {
	if (request.url().startsWith(remote)) sentToRemote.push({ url: request.url(), authorization: request.headers().authorization ?? null });
});
await page.route(/^https?:\/\//, async (route) => {
	const url = route.request().url();
	if (url.startsWith(base)) return route.fallback();
	if (url.startsWith(remote))
		return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":"ok"}' });
	return route.abort();
});
target = remote;
current = '/api/reference/ (try-it, remote)';
await tryIt();
if (!sentToRemote.some((r) => r.authorization === `Bearer ${token}`))
	problems.push(`try-it did not send the token straight to ${remote} (browser sent ${JSON.stringify(sentToRemote)})`);

// "Your Colophon URL" is kept in the browser and never sent anywhere: with one stored, every page
// shows it in its examples and none contacts it.
const yours = 'https://my-colophon.example.net';
const stored = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await stored.addInitScript((url) => {
	try {
		localStorage.setItem('colophon-docs:server', url);
	} catch {}
}, yours);
const reached = [];
stored.on('request', (request) => {
	if (new URL(request.url()).host === new URL(yours).host) reached.push(request.url());
});
const storedPage = await stored.newPage();
for (const path of paths) await storedPage.goto(base + path, { waitUntil: 'networkidle' });
await storedPage.goto(`${base}/api/delivery/`, { waitUntil: 'networkidle' });
const code = await storedPage.locator('.sl-markdown-content pre').allInnerTexts();
const copies = await storedPage.locator('.sl-markdown-content [data-code]').evaluateAll((buttons) => buttons.map((b) => b.dataset.code ?? ''));
if (!code.some((text) => text.includes(yours))) problems.push("no example on the delivery page shows the stored URL");
if (code.some((text) => text.includes('https://cms.example.com'))) problems.push('an example still shows cms.example.com with a URL stored');
if (copies.some((text) => text.includes('https://cms.example.com'))) problems.push('a copy button still copies cms.example.com with a URL stored');
if (reached.length > 0) problems.push(`the stored URL was contacted: ${reached.slice(0, 3).join(', ')}`);
await stored.close();
await browser.close();
server.close();

const own = new Set([new URL(base).host, `127.0.0.1:${stubPort}`, new URL(remote).host]);
for (const host of foreignHosts(hosts.keys(), own)) problems.push(`${host} contacted from ${[...hosts.get(host)].slice(0, 3).join(', ')}`);

console.log(`check-privacy: ${paths.length} pages; hosts contacted: ${[...hosts.keys()].join(', ')}`);
console.log(`  try-it: browser sent ${sentToStub.length} request(s) to the configured server (${sentToStub.map((r) => `${r.method} ${new URL(r.url).pathname}`).join(', ')}), the stub received ${received.length}; token in storage before reload ${JSON.stringify(before)}, after ${JSON.stringify(after)}; to ${remote}: ${sentToRemote.length} request(s), direct`);
if (problems.length > 0) {
	console.error(`check-privacy: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
	process.exit(1);
}
console.log('check-privacy: only this site, the configured server and the allowlisted analytics hosts were contacted; no token kept after reload; a stored Your Colophon URL is shown and never contacted');
