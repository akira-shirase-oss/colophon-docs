// Which docs addresses IndexNow is told about, for which changed files; and the key file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE, keyOf, urlsFor } from './indexnow.mjs';

const all = [`${SITE}/`, `${SITE}/quick-start/`, `${SITE}/api/delivery/`];

test('a docs page, the introduction, a changelog entry and the OpenAPI copy map to their pages', () => {
	assert.deepEqual(urlsFor(['src/content/docs/api/delivery.mdx'], all), [`${SITE}/api/delivery/`]);
	assert.deepEqual(urlsFor(['src/content/docs/index.mdx'], all), [`${SITE}/`]);
	assert.deepEqual(urlsFor(['src/content/changelog/2026-11-19-x.md'], all), [`${SITE}/changelog/`]);
	assert.deepEqual(urlsFor(['src/data/openapi.json'], all), [`${SITE}/api/reference/`]);
});

test('components, styles, config and public files send every address; scripts and docs notes none', () => {
	for (const path of ['src/components/Head.astro', 'src/styles/theme.css', 'astro.config.mjs', 'public/_headers']) {
		assert.deepEqual(urlsFor([path], all), [...all].sort(), path);
	}
	assert.deepEqual(urlsFor(['README.md', 'scripts/check-dist.mjs', '.github/workflows/ci.yml'], all), []);
});

test('the key is the one public/<32 hex>.txt that holds its own name, and the committed one is valid', () => {
	const dir = mkdtempSync(join(tmpdir(), 'indexnow-'));
	const key = '0123456789abcdef0123456789abcdef';
	writeFileSync(join(dir, `${key}.txt`), key);
	writeFileSync(join(dir, 'robots.txt'), 'x');
	assert.equal(keyOf(dir), key);
	writeFileSync(join(dir, `${key}.txt`), 'other');
	assert.throws(() => keyOf(dir));
	rmSync(dir, { recursive: true, force: true });
	assert.match(keyOf(), /^[0-9a-f]{32}$/);
});
