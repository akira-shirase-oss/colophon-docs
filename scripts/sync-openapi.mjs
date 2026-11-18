#!/usr/bin/env node
// The API reference renders Colophon's own OpenAPI document, committed here as
// src/data/openapi.json. This script copies it from colophon-cms `main`.
//
//   node scripts/sync-openapi.mjs            copy the document from main
//   node scripts/sync-openapi.mjs --check    exit 1 if the copy differs from main (CI's drift check)
//
// The source is the raw file on GitHub, or a local checkout with COLOPHON_CMS_DIR=/path/to/colophon-cms.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const target = new URL('../src/data/openapi.json', import.meta.url);
const remote = 'https://raw.githubusercontent.com/akira-shirase-oss/colophon-cms/main/docs/api/openapi.json';
const check = process.argv.includes('--check');

async function upstream() {
	const dir = process.env.COLOPHON_CMS_DIR;
	if (dir) return { text: await readFile(join(dir, 'docs/api/openapi.json'), 'utf8'), from: 'COLOPHON_CMS_DIR' };
	const response = await fetch(remote, { signal: AbortSignal.timeout(30_000) });
	if (!response.ok) throw new Error(`GET ${remote} answered ${response.status}`);
	return { text: await response.text(), from: remote };
}

const { text, from } = await upstream();
const parsed = JSON.parse(text); // refuse to copy something that isn't JSON
if (typeof parsed.openapi !== 'string' || typeof parsed.paths !== 'object') {
	throw new Error(`${from} is not an OpenAPI document`);
}

let current = '';
try {
	current = await readFile(target, 'utf8');
} catch {
	// no copy yet
}

if (check) {
	if (current === text) {
		console.log(`openapi: the copy matches colophon-cms main (${Object.keys(parsed.paths).length} paths, version ${parsed.info.version})`);
		process.exit(0);
	}
	console.error('openapi: src/data/openapi.json differs from colophon-cms main. Run `npm run sync:openapi` and commit the result.');
	process.exit(1);
}

if (current === text) {
	console.log('openapi: already current');
} else {
	await writeFile(target, text);
	console.log(`openapi: copied from ${from} (${Object.keys(parsed.paths).length} paths, version ${parsed.info.version})`);
}
