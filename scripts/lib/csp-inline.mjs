// Which inline <script> blocks the content security policy must allow, and which it may skip.
//
// An inline script runs only if its SHA-256 is in script-src, so every executable one is hashed.
// The one exception is a JSON-LD block: `type="application/ld+json"` is data that the browser parses
// for search engines and never executes, so script-src has nothing to allow. The exemption is an
// EXACT match on that type (case-insensitive, trimmed, no parameters). Any other type the build
// doesn't recognise fails, so `application/json`, `application/ld+json;x` or a typo can't slip past
// the policy as "data".
import { createHash } from 'node:crypto';

/** Types that run as script: hashed. An absent or empty type is classic JavaScript. */
export const EXECUTABLE_TYPES = new Set(['', 'text/javascript', 'module']);
/** The only data type exempt from hashing. */
export const DATA_TYPE = 'application/ld+json';

const typeOf = (attributes) => {
	const match = attributes.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
	return match ? (match[1] ?? match[2] ?? match[3]).trim().toLowerCase() : '';
};

/**
 * Inline scripts in one HTML document.
 * @param {string} html
 * @returns {{ hashes: string[], data: number, problems: string[] }}
 */
export function inlineScripts(html) {
	const hashes = [];
	const problems = [];
	let data = 0;
	for (const [, attributes, body] of html.matchAll(/<script(?![^>]*\bsrc\s*=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
		const type = typeOf(attributes);
		if (type === DATA_TYPE) data += 1;
		else if (EXECUTABLE_TYPES.has(type)) hashes.push(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
		else problems.push(`an inline <script type="${type}"> is neither JavaScript nor JSON-LD; hash it or remove it`);
	}
	return { hashes, data, problems };
}
