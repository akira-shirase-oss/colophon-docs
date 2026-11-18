// After the build: every table in the pages' content takes keyboard focus, since a wide one
// scrolls sideways on a phone and a scrolling region must be reachable from the keyboard
// (WCAG 2.1.1; axe's scrollable-region-focusable). Done in the built HTML so it holds without
// JavaScript too; code blocks get the same from src/lib/focusable-code.mjs.
//
//   node scripts/focusable-tables.mjs [dist]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** `html` with every `<table>` that has no tabindex given `tabindex="0"`. */
export function focusableTables(html) {
	return html.replace(/<table(?![^>]*\btabindex=)([^>]*)>/gi, '<table tabindex="0"$1>');
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.html') ? [join(dir, entry.name)] : []));

if (import.meta.url === `file://${process.argv[1]}`) {
	const dist = process.argv[2] ?? 'dist';
	let tables = 0;
	let pages = 0;
	for (const file of walk(dist)) {
		const html = readFileSync(file, 'utf8');
		const next = focusableTables(html);
		if (next !== html) {
			tables += (html.match(/<table\b/gi) ?? []).length;
			pages += 1;
			writeFileSync(file, next);
		}
	}
	console.log(`focusable-tables: ${tables} tables on ${pages} pages take keyboard focus`);
}
