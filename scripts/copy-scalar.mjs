#!/usr/bin/env node
// The API reference page runs Scalar's browser build from this site, not from a CDN: the version is
// the one package.json pins, and the page needs no third-party script. This copies the ES module
// build and its chunks (no source maps) into public/scalar/, which git ignores.
import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

// The package's exports hide package.json, so find it under node_modules directly.
const root = new URL('../node_modules/@scalar/api-reference/', import.meta.url).pathname;
const from = join(root, 'dist/browser');
const to = new URL('../public/scalar/', import.meta.url).pathname;

await rm(to, { recursive: true, force: true });
await mkdir(join(to, 'chunks'), { recursive: true });
await cp(join(from, 'standalone.esm.js'), join(to, 'standalone.esm.js'));
let chunks = 0;
for (const name of await readdir(join(from, 'chunks'))) {
	if (name.endsWith('.map')) continue;
	await cp(join(from, 'chunks', name), join(to, 'chunks', name));
	chunks += 1;
}
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
console.log(`scalar: @scalar/api-reference ${version}, the ES module build and ${chunks} chunks copied to public/scalar/`);
