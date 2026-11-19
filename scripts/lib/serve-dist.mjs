// A static server for a built site that sends the headers Cloudflare Pages would: every rule in the
// directory's _headers file, applied by scripts/lib/headers.mjs. `astro preview` ignores _headers,
// so browser checks that need the real content security policy use this instead. Local only: it
// binds 127.0.0.1 on a port the system picks.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { headersFor, parseHeaders } from './headers.mjs';

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.xml': 'application/xml',
	'.txt': 'text/plain; charset=utf-8',
	'.md': 'text/markdown; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.jpg': 'image/jpeg',
	'.woff2': 'font/woff2',
	'.wasm': 'application/wasm',
	'.pf_meta': 'application/octet-stream',
	'.pf_fragment': 'application/octet-stream',
	'.pf_index': 'application/octet-stream',
};

/** Serves `root` until close(); resolves to { base, close }. */
export async function serveDist(root) {
	const rules = parseHeaders(readFileSync(join(root, '_headers'), 'utf8'));
	const server = createServer((request, response) => {
		const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
		let file = normalize(join(root, path));
		if (!file.startsWith(root)) {
			response.writeHead(400).end();
			return;
		}
		if (existsSync(file) && statSync(file).isDirectory()) {
			if (!path.endsWith('/')) {
				response.writeHead(308, { location: `${path}/` }).end();
				return;
			}
			file = join(file, 'index.html');
		}
		let status = 200;
		if (!existsSync(file)) {
			status = 404;
			file = join(root, '404.html');
		}
		const headers = Object.fromEntries(headersFor(rules, path));
		headers['content-type'] ??= TYPES[extname(file)] ?? 'application/octet-stream';
		response.writeHead(status, headers);
		response.end(existsSync(file) ? readFileSync(file) : '');
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}
