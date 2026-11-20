// The runner's comparison: what changes on every run is normalised away, nothing else is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath, resolve as resolvePath } from 'node:path';
import { display, fences, matches, normalise, redactions, suiteScript } from './snippets.mjs';

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

test("a failing step's printed answer hides its tokens, secrets and cookies, and keeps the rest", () => {
	const answer = [
		'{"data":{"id":"01a1","token":"cpc_live_9f8e7d6c5b4a3210","name":"Site"}}',
		'{"error":{"code":"rate_limited","message":"too many requests"}}',
		'Authorization: Bearer cpv_abcdefgh12345678',
		'set-cookie: colophon_session=s3cr3tvalue; Path=/',
		'{"secret": "whsec_abc", "password":"hunter2hunter2"}',
		'curl 429 POST http://127.0.0.1:58000/api/v1/x?k=cpv_0123456789abcdef',
	].join('\n');
	const sed = spawnSync('sed', ['-E', ...redactions.flatMap((r) => ['-e', r])], { input: answer, encoding: 'utf8' });
	assert.equal(sed.status, 0, sed.stderr);
	const out = sed.stdout;
	for (const secret of ['cpc_live_9f8e7d6c5b4a3210', 'cpv_abcdefgh12345678', 's3cr3tvalue', 'whsec_abc', 'hunter2hunter2', 'cpv_0123456789abcdef']) {
		assert.ok(!out.includes(secret), `${secret} leaked:\n${out}`);
	}
	for (const kept of ['"id":"01a1"', '"name":"Site"', 'rate_limited', 'too many requests', '429 POST', 'Path=/']) {
		assert.ok(out.includes(kept), `${kept} was lost:\n${out}`);
	}
});

test('a failing step prints what the server answered, redacted, and the last requests', () => {
	const root = resolvePath(new URL('..', import.meta.url).pathname);
	const dir = mkdtempSync(joinPath(tmpdir(), 'snippets-'));
	const steps = [
		// A step the page shows failing (exit=1) runs first: its expected failure must not use up the print.
		{ kind: 'run', file: joinPath(root, 'src/content/docs/cli.mdx'), info: 'sh run=test exit=1', code: `echo '{"error":{"code":"unreachable"}}'; false` },
		{
			kind: 'run',
			file: joinPath(root, 'src/content/docs/api/website-connections.mdx'),
			info: 'sh run=test',
			// A request that gets no answer (a closed port), then the error body a page's command printed.
			code: `curl -s -o /dev/null http://127.0.0.1:58155/nothing || true\necho '{"error":{"code":"rate_limited","message":"slow down"},"token":"cpc_live_0123456789ab"}'`,
		},
		{ kind: 'script', file: joinPath(root, 'src/content/docs/api/website-connections.mdx'), path: 'snippets/from-last.sh', args: 'ID=.data.id' },
	];
	const script = joinPath(dir, 'suite.sh');
	writeFileSync(script, suiteScript(steps, { dir, workdir: dir, base: 'http://127.0.0.1:58155', skip: new Set() }));
	const run = spawnSync('bash', [script], { encoding: 'utf8' });
	assert.notEqual(run.status, 0, 'the step must fail, as it does when the answer has no id');
	assert.match(run.stderr, /from-last: no \.data\.id in the last answer/);
	assert.match(run.stderr, /--- the last requests \(status, method, URL\):\n000 GET http:\/\/127\.0\.0\.1:58155\/nothing/);
	assert.match(run.stderr, /--- step 1 printed \(redacted\):\n.*"code":"rate_limited"/);
	assert.ok(!run.stderr.includes('unreachable'), 'the expected failure printed nothing');
	assert.ok(!run.stderr.includes('cpc_live_0123456789ab'), run.stderr);
	assert.equal(run.stderr.split('--- the last requests').length, 2, 'said once, however many traps fire');
});
