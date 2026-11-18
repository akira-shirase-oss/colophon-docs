// Pages show https://cms.example.com; CI runs them against a real local stack. These tests hold
// the three halves of that: what runs, what compares, and what may be shown.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXAMPLE_BASE, normalise, runnable, shownBase } from './snippets.mjs';
import { ALLOWED, strayLocalUrls } from './check-urls.mjs';
import { parseColophonUrl } from '../src/lib/your-url.ts';

test('a block that shows cms.example.com runs against the local stack', () => {
	const code = 'curl "https://cms.example.com/content/v1/$PROJECT/production/recipes"';
	assert.equal(runnable(code, 'http://localhost:58141'), 'curl "http://localhost:58141/content/v1/$PROJECT/production/recipes"');
	assert.equal(runnable('curl http://localhost:8080/livez', 'http://localhost:58141'), 'curl http://localhost:58141/livez');
});

test("an output's local address compares equal to the address the page shows", () => {
	const ran = '{"url":"http://localhost:8080/studio/device?code=AB12"}';
	const page = '{"url":"https://cms.example.com/studio/device?code=AB12"}';
	assert.equal(normalise(ran), normalise(page));
	assert.notEqual(normalise(ran), normalise('{"url":"https://other.example.org/studio/device?code=AB12"}'));
});

test('pages show the example domain, except where the reader runs Colophon on this machine', () => {
	assert.equal(shownBase('/x/src/content/docs/api/delivery.mdx'), EXAMPLE_BASE);
	assert.equal(shownBase('/x/src/content/docs/quick-start.mdx'), 'http://localhost:8080');
	assert.equal(shownBase('/x/src/content/docs/installation.mdx'), 'http://localhost:8080');
});

test('a local URL outside the allowed pages is caught, with its line', () => {
	assert.deepEqual(strayLocalUrls('content/docs/api/delivery.mdx', 'Read it:\ncurl http://localhost:8080/livez\n'), [
		{ line: 2, text: 'curl http://localhost:8080/livez' },
	]);
	assert.equal(strayLocalUrls('content/docs/api/delivery.mdx', 'Host: 127.0.0.1\n').length, 1);
	assert.deepEqual(strayLocalUrls('content/docs/api/delivery.mdx', 'COLOPHON_TRUSTED_PROXIES=127.0.0.1/32 on loopback'), []);
	assert.deepEqual(strayLocalUrls('content/docs/quick-start.mdx', 'open http://localhost:8080/studio/'), []);
	assert.ok('content/docs/quick-start.mdx' in ALLOWED);
});

test('Your Colophon URL: https, or http for this machine; origin only; nothing else', () => {
	assert.deepEqual(parseColophonUrl(' https://cms.mysite.org/api/v1?x=1#y '), { url: 'https://cms.mysite.org' });
	assert.deepEqual(parseColophonUrl('https://user:secret@cms.mysite.org/'), { url: 'https://cms.mysite.org' });
	assert.equal(parseColophonUrl('http://localhost:8080/studio').url, 'http://localhost:8080');
	assert.ok(parseColophonUrl('http://127.0.0.1:58000').note);
	assert.ok('error' in parseColophonUrl('http://cms.mysite.org'));
	assert.ok('error' in parseColophonUrl('javascript:alert(1)'));
	assert.ok('error' in parseColophonUrl('ftp://cms.mysite.org'));
	assert.ok('error' in parseColophonUrl('not a url'));
});
