#!/usr/bin/env node
// After a deploy: tell search engines which docs pages changed, through IndexNow (https://www.indexnow.org; Bing,
// Yandex and others share submissions). Run it once the new build is live:
//
//   node scripts/indexnow.mjs                      # changes since the merge's first parent (the last deploy)
//   node scripts/indexnow.mjs --from <sha> --to <sha>
//   node scripts/indexnow.mjs --dry-run            # print the URLs, send nothing
//
// Which URLs: a changed or deleted page in src/content/docs sends its own address; a changelog entry sends
// /changelog/; the OpenAPI copy sends /api/reference/. A change to anything else that shapes the pages
// (components, styles, config, public/) sends every address in the sitemap. Bounded: at most MAX_URLS in one
// request, a TIMEOUT_MS deadline, one attempt. It never fails a deploy: every outcome, errors included, is
// printed and the exit code is 0 (2 only for a usage error).
//
// The key is public by design: IndexNow verifies a submission by fetching public/<key>.txt from the site.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://docs.colophon.404human.dev';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const MAX_URLS = 10000;
export const TIMEOUT_MS = 10000;

const root = fileURLToPath(new URL('..', import.meta.url));

/** The key: the one public/<32 hex>.txt whose content is its own name. */
export function keyOf(publicDir = join(root, 'public')) {
	const keys = readdirSync(publicDir).filter((n) => /^[0-9a-f]{32}\.txt$/.test(n) && readFileSync(join(publicDir, n), 'utf8').trim() === n.slice(0, -4));
	if (keys.length !== 1) throw new Error(`want exactly one IndexNow key file in public/, found ${keys.length}`);
	return keys[0].slice(0, -4);
}

/**
 * The addresses a set of changed repository paths affects.
 * @param {string[]} changed
 * @param {string[]} everything every address in the sitemap, for changes that can touch every page
 */
export function urlsFor(changed, everything) {
	const urls = new Set();
	for (const path of changed) {
		let m;
		if ((m = path.match(/^src\/content\/docs\/(.+)\.mdx?$/))) urls.add(m[1] === 'index' ? `${SITE}/` : `${SITE}/${m[1].replace(/\/index$/, '')}/`);
		else if (path.startsWith('src/content/changelog/')) urls.add(`${SITE}/changelog/`);
		else if (path === 'src/data/openapi.json') urls.add(`${SITE}/api/reference/`);
		else if (/^(src\/|public\/|astro\.config\.mjs$)/.test(path)) everything.forEach((u) => urls.add(u));
	}
	return [...urls].sort();
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

async function main() {
	const args = process.argv.slice(2);
	const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
	const to = opt('to') ?? 'HEAD';
	const from = opt('from') ?? `${to}^1`;
	const sitemap = join(root, 'dist', 'sitemap-0.xml');
	if (!existsSync(sitemap)) {
		console.error('indexnow: dist/sitemap-0.xml is missing; run it after `npm run build` and the deploy');
		process.exit(2);
	}
	const everything = [...readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	const urls = urlsFor(git('diff', '--name-only', `${from}..${to}`).split('\n').filter(Boolean), everything).slice(0, MAX_URLS);
	if (urls.length === 0) return console.log(`indexnow: nothing that search engines see changed between ${from} and ${to}`);
	const key = keyOf();
	if (args.includes('--dry-run')) return console.log(`indexnow (dry run): would send ${urls.length} URL(s):\n${urls.join('\n')}`);
	try {
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls }),
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		// 200 and 202 mean received; 403 a key the engine couldn't verify yet; 422 URLs outside the host; 429 too often.
		console.log(`indexnow: sent ${urls.length} URL(s); ${ENDPOINT} answered ${response.status} ${response.statusText}`);
	} catch (error) {
		console.log(`indexnow: not sent (${error.name === 'TimeoutError' ? `no answer in ${TIMEOUT_MS} ms` : error.message}); the deploy is unaffected`);
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
