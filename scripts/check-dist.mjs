#!/usr/bin/env node
// What the built site must hold before it may deploy: every page's Markdown copy, the search
// index, llms.txt, the changelog feed, the API reference with its renderer and document, and no
// private names, paths or hosts anywhere in the output.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { homedir, hostname, userInfo } from 'node:os';
import { headersFor, pageOf, parseHeaders } from './lib/headers.mjs';
import { ANALYTICS_REPORT_ORIGIN, ANALYTICS_SCRIPT_ORIGIN } from './lib/third-parties.mjs';

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

// Every Markdown copy a page offers exists.
for (const page of pages) {
	for (const match of readFileSync(page, 'utf8').matchAll(/(?:data-copy-md|href)="(\/[^"#?]*\.md)"/g)) {
		if (!existsSync(join(dist, match[1]))) problems.push(`${relative(dist, page)} offers ${match[1]}, which isn't built`);
	}
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

// Search snippets: every page's description is 120 to 155 characters (longer ones are cut in
// results) and names no decision number, commit hash or repository path.
for (const page of pages) {
	const rel = relative(dist, page);
	if (rel === '404.html') continue;
	const html = readFileSync(page, 'utf8');
	const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1]?.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
	if (description === undefined) problems.push(`${rel} has no meta description`);
	else {
		const length = [...description].length;
		if (length < 120 || length > 155) problems.push(`${rel}: the description is ${length} characters; keep it to 120-155`);
		if (/\b[0-9a-f]{7,40}\b/.test(description) || /\b(src|scripts|crates|docs|public)\//.test(description)) problems.push(`${rel}: the description names a hash or a repository path`);
	}
	// Structured data parses, and each page has the types the Head override writes.
	const types = [];
	for (const [, body] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
		try {
			types.push(JSON.parse(body)['@type']);
		} catch {
			problems.push(`${rel}: a JSON-LD block doesn't parse`);
		}
	}
	const expected = rel === 'index.html' ? ['WebSite'] : rel.startsWith('api/reference/') ? [] : ['BreadcrumbList', 'TechArticle'];
	if (types.join() !== expected.join()) problems.push(`${rel}: JSON-LD types are [${types}], expected [${expected}]`);
}

// The content security policy names exactly one third party, Cloudflare Web Analytics
// (scripts/lib/third-parties.mjs): its script origin in script-src, its report origin in
// connect-src, nothing anywhere else. (The API reference's connect-src keeps its own `https:` and
// local addresses for Test Request.)
const served = parseHeaders(readFileSync(join(dist, '_headers'), 'utf8'));
for (const path of ['/', '/quick-start/', '/api/reference/']) {
	const policy = headersFor(served, path).get('content-security-policy') ?? '';
	for (const directive of policy.split(';').map((d) => d.trim()).filter(Boolean)) {
		const [name, ...sources] = directive.split(/\s+/);
		const origins = sources.filter((source) => /^https?:\/\/[^*]/.test(source) && !/^http:\/\/(localhost|127\.0\.0\.1):/.test(source));
		const want = name === 'script-src' ? [ANALYTICS_SCRIPT_ORIGIN] : name === 'connect-src' && path !== '/api/reference/' ? [ANALYTICS_REPORT_ORIGIN] : [];
		if (origins.join() !== want.join()) problems.push(`${path}: ${name} names [${origins}], expected exactly [${want}]`);
	}
}

// Every Markdown copy names its HTML page as canonical (scripts/md-canonical.mjs).
for (const copy of all.filter((file) => file.endsWith('.md')).map((file) => `/${relative(dist, file)}`)) {
	const page = pageOf(copy);
	const link = headersFor(served, copy).get('link') ?? '';
	if (link !== `<https://docs.colophon.404human.dev${page}>; rel="canonical"`) problems.push(`${copy}: Link is "${link}", expected its page ${page} as canonical`);
	if (!existsSync(join(dist, page, 'index.html'))) problems.push(`${copy}: its page ${page} isn't built`);
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
