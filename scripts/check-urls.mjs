#!/usr/bin/env node
// Examples show https://cms.example.com (reserved for examples, RFC 2606), not a local address: a
// reader copies what they see onto their own server. A localhost or 127.0.0.1 address may appear
// only on the pages below, where it is a fact (the quick start runs on this machine; a command runs
// inside the quick start's container; the CLI's default; a production listener behind its proxy).
// Anywhere else this check fails the build and names the line.
//
//   node scripts/check-urls.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;

/** Pages where a local address is a fact, and why. Paths are relative to src/. */
export const ALLOWED = {
	'content/docs/quick-start.mdx': 'the quick start runs on this machine',
	'content/docs/installation.mdx': 'installing on this machine, and a production listener behind its proxy',
	'content/docs/cli.mdx': "the CLI's default server, and the CLI inside the quick start's container",
	'content/docs/mcp.mdx': "colophon mcp inside the quick start's container; the plain-http rule",
	'content/docs/sdk.mdx': "the quick start's address, named as such; a closed port for the retry example",
	'content/docs/self-hosting/backups.mdx': "the quick start's backup and restore drill",
	'content/docs/self-hosting/configuration.mdx': 'listen addresses and defaults',
	'content/docs/self-hosting/database-tls.mdx': 'what counts as loopback',
	'content/docs/self-hosting/monitoring.mdx': "doctor inside the quick start's container; the image's health check",
	'content/docs/self-hosting/security.mdx': 'loopback-only services and development shortcuts',
	'content/docs/api/website-connections.mdx': 'a local address shown being refused',
	'content/docs/studio/preview.mdx': 'plain http only for a development server on localhost',
	'pages/api/reference.astro': "the API reference's second server, the quick start on this machine",
};

// A local URL, or a Host header naming one. (A network such as 127.0.0.1/32, or the word in prose
// about loopback rules, is a fact anywhere.)
const LOCAL = /\bhttps?:\/\/(localhost|127\.0\.0\.1|\[::1\])\b|^\s*Host: (localhost|127\.0\.0\.1)\b/i;

/** The lines of `text` (a file under src/, at `path`) that name a local address where none may be. */
export function strayLocalUrls(path, text) {
	if (path in ALLOWED) return [];
	return text
		.split('\n')
		.map((line, index) => ({ line: index + 1, text: line }))
		.filter(({ text }) => LOCAL.test(text));
}

function files(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : /\.(mdx?|astro)$/.test(name) ? [path] : [];
	});
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const src = join(ROOT, 'src');
	const stray = files(src).flatMap((file) => {
		const path = relative(src, file);
		return strayLocalUrls(path, readFileSync(file, 'utf8')).map((hit) => `src/${path}:${hit.line}: ${hit.text.trim()}`);
	});
	if (stray.length > 0) {
		console.error(`check-urls: ${stray.length} local address(es) outside the pages allowed to name one (scripts/check-urls.mjs):\n${stray.map((s) => `  ${s}`).join('\n')}`);
		process.exit(1);
	}
	console.log(`check-urls: local addresses only where they are facts (${Object.keys(ALLOWED).length} pages allowed)`);
}
