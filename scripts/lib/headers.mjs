// Cloudflare Pages' _headers file: writing rules, counting them, and applying them the way Pages
// does, so local checks serve exactly the headers production sends.
// Format (https://developers.cloudflare.com/pages/configuration/headers/): a rule is an unindented
// URL pattern followed by indented `Name: value` lines; `! Name` removes a header an earlier rule set;
// `*` matches any characters and `:name` one path segment; every matching rule applies, in order.

export const MAX_RULES = 100;

/** The page a Markdown copy belongs to: /index.md → /, /api/delivery.md → /api/delivery/. */
export function pageOf(copy) {
	if (!copy.startsWith('/') || !copy.endsWith('.md')) throw new Error(`not a Markdown copy: ${copy}`);
	const stem = copy.slice(0, -'.md'.length);
	return stem === '/index' ? '/' : `${stem}/`;
}

/** One rule per Markdown copy: a Link header naming its page as canonical. */
export function canonicalRules(site, copies) {
	return [...copies]
		.sort()
		.map((copy) => `${copy}\n  Link: <${new URL(pageOf(copy), site).href}>; rel="canonical"\n`)
		.join('\n');
}

const isRuleLine = (line) => line.length > 0 && !/^\s/.test(line) && !line.startsWith('#');

/** How many rules a _headers file holds. */
export const countRules = (text) => text.split('\n').filter(isRuleLine).length;

/** Parses a _headers file into [{ pattern, set: [[name, value]], remove: [name] }]. */
export function parseHeaders(text) {
	const rules = [];
	for (const line of text.split('\n')) {
		if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
		if (isRuleLine(line)) {
			rules.push({ pattern: line.trim(), set: [], remove: [] });
			continue;
		}
		const rule = rules.at(-1);
		if (!rule) throw new Error(`a header line before any rule: ${line}`);
		const body = line.trim();
		if (body.startsWith('!')) rule.remove.push(body.slice(1).trim().toLowerCase());
		else {
			const colon = body.indexOf(':');
			rule.set.push([body.slice(0, colon).trim().toLowerCase(), body.slice(colon + 1).trim()]);
		}
	}
	return rules;
}

const matcher = (pattern) =>
	new RegExp(
		`^${pattern
			.split(/(\*|:[A-Za-z]\w*)/)
			.map((part) => (part === '*' ? '.*' : part.startsWith(':') ? '[^/]+' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')))
			.join('')}$`,
	);

/** The headers Pages sends for `path`. Repeated names are joined with ", ", as Pages does. */
export function headersFor(rules, path) {
	const out = new Map();
	for (const rule of rules) {
		if (!matcher(rule.pattern).test(path)) continue;
		for (const name of rule.remove) out.delete(name);
		for (const [name, value] of rule.set) out.set(name, out.has(name) ? `${out.get(name)}, ${value}` : value);
	}
	return out;
}
