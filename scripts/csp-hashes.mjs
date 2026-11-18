#!/usr/bin/env node
// After `astro build`: lets the built site's own inline scripts run, and no others. Collects the
// SHA-256 of every inline <script> in dist/**/*.html and writes them into dist/_headers in place of
// the INLINE_SCRIPT_HASHES placeholder, so the content security policy needs no 'unsafe-inline' for
// scripts. Fails if the site has an inline event handler (onclick="…"), which a hash can't allow, or
// if the placeholder is missing.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const PLACEHOLDER = 'INLINE_SCRIPT_HASHES';

const pages = [];
(function walk(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path);
		else if (path.endsWith('.html')) pages.push(path);
	}
})(dist);

const hashes = new Set();
const problems = [];
for (const page of pages) {
	const html = readFileSync(page, 'utf8');
	for (const [, , body] of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
		hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
	}
	if (/\son[a-z]+\s*=\s*["']/i.test(html)) problems.push(`${page.slice(dist.length)} has an inline event handler`);
}

const headersPath = join(dist, '_headers');
const headers = readFileSync(headersPath, 'utf8');
const isRule = (line) => !line.trimStart().startsWith('#');
if (!headers.split('\n').some((line) => isRule(line) && line.includes(PLACEHOLDER))) problems.push(`dist/_headers has no ${PLACEHOLDER} placeholder`);
if (problems.length > 0) {
	console.error(`csp-hashes: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
	process.exit(1);
}
const allowed = [...hashes].sort().join(' ');
const written = headers
	.split('\n')
	.map((line) => (isRule(line) ? line.replaceAll(PLACEHOLDER, allowed) : line))
	.join('\n');
for (const line of written.split('\n')) {
	if (line.length > 2000) {
		console.error(`csp-hashes: a _headers line is ${line.length} characters; Cloudflare Pages allows 2000`);
		process.exit(1);
	}
}
writeFileSync(headersPath, written);
console.log(`csp-hashes: ${hashes.size} inline scripts allowed by hash across ${pages.length} pages`);
