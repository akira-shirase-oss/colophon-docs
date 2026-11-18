// The runner's comparison: what changes on every run is normalised away, nothing else is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { display, fences, matches, normalise } from './snippets.mjs';

const answer = (id, date, body) =>
	`HTTP/1.1 200 OK\r\ncontent-type: application/json\r\nx-request-id: ${id}\r\ncontent-length: ${body.length}\r\ndate: ${date}\r\n\r\n${body}`;

test('ids, dates, lengths and secrets do not count', () => {
	const a = answer('01a1ee61-d403-73ff-9f17-bfd7ba3edc0f', 'Wed, 18 Nov 2026 11:19:11 GMT', '{"data":{"id":"01a1ee60-fb76-740c-b27d-a0ff261d43ef","secret":"colophon_api_njuG6u66jGpnsDYcCIaVDw3LFN9JieOMYQ4M_I7MhH0","at":"2026-11-18T11:18:28.662149Z"}}');
	const b = answer('01a1ee70-0000-7000-8000-000000000001', 'Thu, 19 Nov 2026 01:02:03 GMT', '{"data":{"id":"01a1ee70-0000-7000-8000-000000000002","secret":"colophon_api_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","at":"2026-11-19T01:02:03Z"}}');
	assert.equal(normalise(a), normalise(b));
});

test('a different status, header, key or value counts', () => {
	const base = answer('01a1ee61-d403-73ff-9f17-bfd7ba3edc0f', 'Wed, 18 Nov 2026 11:19:11 GMT', '{"data":{"title":"Lemon tart","published_in":1}}');
	assert.notEqual(normalise(base), normalise(base.replace('200 OK', '201 Created')));
	assert.notEqual(normalise(base), normalise(base.replace('application/json', 'text/plain')));
	assert.notEqual(normalise(base), normalise(base.replace('"published_in":1', '"published_in":2')));
	assert.notEqual(normalise(base), normalise(base.replace('"title"', '"name"')));
});

test('the page may show JSON indented; the comparison is by value and key order', () => {
	const compact = answer('01a1ee61-d403-73ff-9f17-bfd7ba3edc0f', 'Wed, 18 Nov 2026 11:19:11 GMT', '{"data":{"a":1,"b":[1,2]}}');
	assert.equal(normalise(display(compact)), normalise(compact));
	assert.match(display(compact), /\n {2}"data": \{\n/);
	assert.notEqual(normalise(compact), normalise(compact.replace('{"a":1,"b":[1,2]}', '{"b":[1,2],"a":1}')));
});

test('a blank line before a fence never joins it to the blocks after it', () => {
	// A stream's answer ends with a blank line, so its closing fence follows one.
	const page = 'Text.\n\n```sh not-run="x"\ncurl -N http://localhost:8080/events\n```\n\nMore.\n\n```http\nevent: hello\n\n```\n\n- item\n\n  ```ts\n  const a = 1;\n\n  const b = 2;\n  ```\n';
	const found = fences(page).map((match) => [match[3], match[5]]);
	assert.deepEqual(found, [
		['sh', 'curl -N http://localhost:8080/events'],
		['http', 'event: hello\n'],
		['ts', '  const a = 1;\n\n  const b = 2;'],
	]);
});

test('the page shows numbers exactly as the server wrote them', () => {
	const float = answer('01a1ee61-d403-73ff-9f17-bfd7ba3edc0f', 'Wed, 18 Nov 2026 11:19:11 GMT', '{"minutes":45.0,"ratio":1.50,"count":3}');
	assert.match(display(float), /"minutes": 45\.0,/);
	assert.match(display(float), /"ratio": 1\.50,/);
	assert.match(display(float), /"count": 3\n/);
});

test('a paging cursor (REST next_cursor, GraphQL endCursor) does not count; a missing one does', () => {
	const page = (cursor) => answer('01a1ee61-d403-73ff-9f17-bfd7ba3edc0f', 'Wed, 18 Nov 2026 11:19:11 GMT', `{"next_cursor":${cursor},"data":{"pageInfo":{"endCursor":${cursor}}}}`);
	assert.equal(normalise(page('"djE6YWFh"')), normalise(page('"djE6YmJi"')));
	assert.notEqual(normalise(page('"djE6YWFh"')), normalise(page('null')));
});

test('match=lines: every line the page shows must arrive, in any order; others may come too', () => {
	const page = { info: ' output=ops match=lines', code: 'event: change\ndata: {"k":"entries"}\n\nevent: hello\ndata: {}' };
	assert.ok(matches('event: hello\ndata: {}\n\nevent: change\ndata: {"k":"tokens"}\n\nevent: change\ndata: {"k":"entries"}\n', page));
	assert.ok(!matches('event: hello\ndata: {}\n\nevent: change\ndata: {"k":"tokens"}\n', page));
	assert.ok(!matches('event: hello\ndata: {}\n', { info: ' output=ops', code: 'event: hello\ndata: {}\nmore' }));
});
