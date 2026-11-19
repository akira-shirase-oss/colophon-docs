// The search-engine and policy helpers: which inline scripts get a hash, how JSON-LD is written,
// which third parties a page may contact, and how _headers rules apply.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inlineScripts } from './lib/csp-inline.mjs';
import { foreignHosts, ALLOWED_THIRD_PARTY_HOSTS } from './lib/third-parties.mjs';
import { canonicalRules, countRules, headersFor, pageOf, parseHeaders } from './lib/headers.mjs';
import { docsJsonLd, jsonLd } from '../src/lib/json-ld.mjs';

const script = (attributes, body = 'console.log(1)') => `<script${attributes}>${body}</script>`;

test('executable inline scripts are hashed: no type, an empty type, text/javascript, module', () => {
	for (const attributes of ['', ' type=""', ' type="text/javascript"', ' type="module"', " type='MODULE '"]) {
		const found = inlineScripts(script(attributes));
		assert.equal(found.hashes.length, 1, attributes);
		assert.deepEqual(found.problems, [], attributes);
		assert.equal(found.data, 0, attributes);
	}
});

test('only an exact application/ld+json is data that needs no hash', () => {
	for (const attributes of [' type="application/ld+json"', ' type=" Application/LD+JSON "']) {
		const found = inlineScripts(script(attributes, '{"@type":"Thing"}'));
		assert.deepEqual(found, { hashes: [], data: 1, problems: [] }, attributes);
	}
});

test('any other script type fails as unrecognised, so it cannot pass as data', () => {
	for (const attributes of [' type="application/ld+json;x"', ' type="application/json"', ' type="text/plain"', ' type="ld+json"']) {
		const found = inlineScripts(script(attributes));
		assert.equal(found.hashes.length, 0, attributes);
		assert.equal(found.problems.length, 1, attributes);
	}
});

test('a script with src is not inline and is not hashed', () => {
	assert.deepEqual(inlineScripts('<script src="/a.js"></script>'), { hashes: [], data: 0, problems: [] });
});

test('a title holding </script> or <!-- cannot break out of a JSON-LD block', () => {
	const title = 'A </script><script>alert(1)</script> <!-- & title';
	const [, article] = docsJsonLd({ site: 'https://docs.example.com', path: '/x/', title, description: 'd' });
	const body = jsonLd(article);
	assert.doesNotMatch(body, /<\/?script/i);
	assert.doesNotMatch(body, /<!--/);
	assert.doesNotMatch(body, /[<>&]/);
	assert.equal(JSON.parse(body).headline, title);
	// And as the browser sees it: the block ends exactly once, at its own closing tag.
	const html = `<script type="application/ld+json">${body}</script>`;
	assert.equal(html.match(/<\/script>/g).length, 1);
});

test('docs JSON-LD: WebSite on the introduction; a breadcrumb trail and a TechArticle elsewhere, published by the project', () => {
	const site = 'https://docs.example.com';
	const [home] = docsJsonLd({ site, path: '/', title: 'Introduction', description: 'd' });
	assert.equal(home['@type'], 'WebSite');
	const [crumbs, article] = docsJsonLd({ site, path: '/api/delivery/', title: 'Delivery API', lastUpdated: new Date('2026-11-18T00:00:00Z') });
	assert.deepEqual(
		crumbs.itemListElement.map((item) => [item.position, item.name, item.item]),
		[
			[1, 'Docs', 'https://docs.example.com/'],
			[2, 'APIs', 'https://docs.example.com/api/'],
			[3, 'Delivery API', undefined],
		],
	);
	assert.equal(article['@type'], 'TechArticle');
	assert.equal(article.dateModified, '2026-11-18T00:00:00.000Z');
	assert.equal(article.publisher['@type'], 'Organization');
	assert.equal(article.author['@type'], 'Organization');
	const [studioCrumbs] = docsJsonLd({ site, path: '/studio/rollback/', title: 'Rollback' });
	assert.equal(studioCrumbs.itemListElement.length, 2);
});

test('third parties: exactly the two Cloudflare Web Analytics hosts are allowed', () => {
	assert.deepEqual([...ALLOWED_THIRD_PARTY_HOSTS], ['static.cloudflareinsights.com', 'cloudflareinsights.com']);
	const own = ['docs.example.com'];
	assert.deepEqual(foreignHosts(['docs.example.com', 'static.cloudflareinsights.com', 'cloudflareinsights.com'], own), []);
	// The known-bad third origin, and look-alikes of the allowed ones, are foreign.
	assert.deepEqual(foreignHosts(['evil.example', 'www.cloudflareinsights.com', 'static.cloudflareinsights.com.evil.example'], own), [
		'evil.example',
		'www.cloudflareinsights.com',
		'static.cloudflareinsights.com.evil.example',
	]);
});

test('Markdown copies map to their page and get one canonical rule each', () => {
	assert.equal(pageOf('/index.md'), '/');
	assert.equal(pageOf('/quick-start.md'), '/quick-start/');
	assert.equal(pageOf('/api/delivery.md'), '/api/delivery/');
	assert.throws(() => pageOf('/quick-start/'));
	const rules = canonicalRules('https://docs.example.com', ['/b.md', '/index.md']);
	assert.equal(countRules(rules), 2);
	const parsed = parseHeaders(rules);
	assert.equal(headersFor(parsed, '/index.md').get('link'), '<https://docs.example.com/>; rel="canonical"');
	assert.equal(headersFor(parsed, '/b.md').get('link'), '<https://docs.example.com/b/>; rel="canonical"');
	assert.equal(headersFor(parsed, '/c.md').get('link'), undefined);
});

test('_headers rules apply as Pages applies them: splats, placeholders, removal, joining', () => {
	const rules = parseHeaders(
		['# a comment', '/*', '  X-A: one', '  CSP: base', '', '/*.md', '  Content-Type: text/markdown', '', '/api/:name/*', '  ! CSP', '  CSP: api', '  X-A: two'].join('\n'),
	);
	assert.equal(countRules(['/*', '  X: 1', '# not a rule', '/a', '  X: 2'].join('\n')), 2);
	assert.deepEqual(Object.fromEntries(headersFor(rules, '/')), { 'x-a': 'one', csp: 'base' });
	assert.equal(headersFor(rules, '/api/delivery.md').get('content-type'), 'text/markdown');
	assert.equal(headersFor(rules, '/api/reference/').get('csp'), 'api');
	assert.equal(headersFor(rules, '/api/reference/').get('x-a'), 'one, two');
	assert.equal(headersFor(rules, '/api/').get('csp'), 'base');
});
