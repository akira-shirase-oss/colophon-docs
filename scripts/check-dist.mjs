#!/usr/bin/env node
// What the built site must hold before it may deploy: every page's Markdown copy, the search
// index, llms.txt, the changelog feed, the API reference with its renderer and document, and no
// private names, paths or hosts anywhere in the output.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { homedir, hostname, userInfo } from 'node:os';

const dist = new URL('../dist/', import.meta.url).pathname;
const problems = [];
const need = (path, why) => {
	if (!existsSync(join(dist, path))) problems.push(`missing ${path}: ${why}`);
};

need('index.html', 'the home page');
need('quick-start/index.html', 'the quick start');
need('api/reference/index.html', 'the API reference');
need('openapi.json', 'the document the reference renders');
need('scalar/standalone.esm.js', "the reference's renderer");
need('changelog/index.html', 'the changelog');
need('changelog/rss.xml', 'the changelog feed');
need('pagefind/pagefind.js', 'the search index');
need('llms.txt', 'llms.txt');
need('llms-full.txt', 'llms-full.txt');
need('quick-start.md', "the quick start's Markdown");
need('index.md', "the introduction's Markdown");
need('sitemap-index.xml', 'the sitemap');

function files(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? (name === 'scalar' ? [] : files(path)) : [path];
	});
}
const all = files(dist);
const pages = all.filter((file) => file.endsWith('.html'));
const text = all.filter((file) => /\.(html|md|txt|xml|json)$/.test(file));

// Every docs page has its Markdown twin.
for (const page of pages) {
	const rel = relative(dist, page);
	if (rel === '404.html' || rel.startsWith('api/reference/') || rel.startsWith('changelog/')) continue;
	const md = rel === 'index.html' ? 'index.md' : `${rel.slice(0, -'/index.html'.length)}.md`;
	if (!existsSync(join(dist, md))) problems.push(`missing ${md}: the Markdown copy of ${rel}`);
}

// Public output never names the machine it was built on, its user or a home directory, and never
// cites an internal decision number. The names come from the machine running the build, so this
// file names nobody.
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// (On CI the user is a generic one, such as "runner", which ordinary prose can say; only the path counts there.)
const local = [homedir(), ...(process.env.CI ? [] : [userInfo().username, hostname().split('.')[0]])].filter((name) => name && name.length >= 4);
const forbidden = [/\/Users\/[a-z]/i, /\/home\/[a-z]/, /\bD-\d{3}\b/, ...local.map((name) => new RegExp(escape(name), 'i'))];
for (const file of text) {
	if (file.endsWith('openapi.json')) continue; // Colophon's own document, copied byte for byte
	const body = readFileSync(file, 'utf8');
	for (const pattern of forbidden) {
		if (pattern.test(body)) problems.push(`${relative(dist, file)} contains ${pattern}`);
	}
}

// The search index covers the pages.
const entry = join(dist, 'pagefind/pagefind-entry.json');
const indexed = existsSync(entry)
	? Object.values(JSON.parse(readFileSync(entry, 'utf8')).languages ?? {}).reduce((sum, language) => sum + (language.page_count ?? 0), 0)
	: 0;
if (indexed < 30) problems.push(`the search index holds ${indexed} pages; expected at least 30`);

if (problems.length > 0) {
	console.error(`check-dist: ${problems.length} problem(s)\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
	process.exit(1);
}
console.log(`check-dist: ${pages.length} HTML pages, ${indexed} in the search index; Markdown copies, llms.txt, the feed and the reference present; no private names`);
