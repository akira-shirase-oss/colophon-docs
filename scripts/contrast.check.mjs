// The contrast gate against fixtures, in a real browser: it must FAIL the mistakes it exists for, and pass the
// fixed page. Served from a loopback server on a port the system picks.
// - an inverted map: Starlight's "white" (its strongest ink) pointed at the page colour, as reading the names
//   would suggest in its light theme;
// - a tint: a 30% ground that only fails once blended over the page under it;
// - an undefined custom property, which would otherwise inherit and be measured as some other colour;
// - in the sweep, text on a gradient whose second stop is too light.
//
//   node scripts/contrast.check.mjs
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { contrastOn } from './contrast.mjs';

const page = (css, body = '<p>Text</p>') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title>
<script>const t=localStorage.getItem('starlight-theme')||'light';document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');</script>
<style>:root{--page:#fff;--ink:#333;--bg:var(--page)}.dark{--page:#111;--ink:#eee}body{background:var(--bg);color:var(--ink)}${css}</style></head><body><main>${body}</main></body></html>`;
const pages = {
	'/inverted/': page(':root{--white:var(--page)}'),
	'/tint/': page(':root{--white:#737373;--ground:color-mix(in srgb, #737373 30%, transparent)}.dark{--white:#bbb}'),
	'/undefined/': page(':root{--white:var(--ink)}'),
	'/gradient/': page('', '<p style="background:linear-gradient(90deg,#fff,#bbb);color:#777">Low on its second stop</p>'),
	'/good/': page(':root{--white:var(--ink);--ground:color-mix(in srgb, var(--ink) 6%, transparent)}', '<p style="background:linear-gradient(90deg,#fff,#f4f4f4);color:#333">Readable</p>'),
};
const server = createServer((request, response) => {
	const html = pages[request.url];
	response.writeHead(html ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
	response.end(html ?? 'not found');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
	const pairsOn = async (path, pairs, theme = 'light') => (await contrastOn(browser, base + path, theme, { pairs, sweep: false })).failures;
	const swept = async (path, theme = 'light') => (await contrastOn(browser, base + path, theme)).failures;

	const inverted = await pairsOn('/inverted/', [['ink on page', '--white', ['--bg'], 4.5]]);
	assert.equal(inverted.length, 1, 'an inverted map fails');
	assert.equal(inverted[0].ratio, 1);

	const tinted = [['ink on a tinted ground', '--white', ['--bg', '--ground'], 4.5]];
	assert.equal((await pairsOn('/tint/', [['ink on page', '--white', ['--bg'], 4.5]])).length, 0, '#737373 on white alone passes (4.7:1)');
	assert.equal((await pairsOn('/tint/', tinted)).length, 1, 'the same ink fails once the tint is blended in');
	assert.equal((await pairsOn('/tint/', tinted, 'dark')).length, 0, 'and passes in dark, where the ground is dark');

	const missing = await pairsOn('/undefined/', [['ink on a missing ground', '--white', ['--bg', '--nowhere'], 4.5]]);
	assert.match(missing[0]?.problem ?? '', /not defined here: --nowhere/, 'an undefined property is a failure of its own');

	const gradient = await swept('/gradient/');
	assert.equal(gradient.length, 1, "the sweep measures a gradient's worst stop");
	assert.equal((await swept('/inverted/')).length, 0, 'the sweep measures what is painted, not the names');

	assert.deepEqual(await pairsOn('/good/', [['ink on page', '--white', ['--bg'], 4.5], ['ink on tint', '--white', ['--bg', '--ground'], 4.5]]), []);
	assert.deepEqual(await pairsOn('/good/', [['ink on page', '--white', ['--bg'], 4.5]], 'dark'), []);
	assert.deepEqual(await swept('/good/'), []);
	console.log('contrast: fails an inverted map, a blended tint, an undefined property and a gradient stop; passes the fixed page');
} finally {
	await browser.close();
	server.close();
}
