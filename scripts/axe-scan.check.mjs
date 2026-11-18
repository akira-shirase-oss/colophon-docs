// The scan helper against fixtures, in a real browser: it must FAIL a known-bad page (a button
// whose name hides its visible text, a scrolling region the keyboard can't reach, both only in
// the no-JavaScript state), refuse to scan a card that didn't open, and pass the fixed page.
// Served from a loopback server on a port the system picks.
//
//   node scripts/axe-scan.check.mjs
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { scanState } from './axe-scan.mjs';

const card = (button, code) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title>
<style>pre{width:200px;overflow:auto;white-space:pre}</style></head><body><main>
<h1>Changelog</h1>
<article class="change" id="c1"><div class="change-head"><h3>${button('c1')}</h3></div><div class="change-body" id="c1-body"><p>One.</p></div></article>
<article class="change" id="c2"><div class="change-head"><h3>${button('c2')}</h3><p id="c2-summary">Summary text shown beside it</p></div>
<div class="change-body" id="c2-body">${code}</div></article>
</main>
<script>for(const t of document.querySelectorAll('.change-toggle')){const b=document.getElementById(t.getAttribute('aria-controls'));t.setAttribute('aria-expanded','false');b.hidden=true;
t.addEventListener('click',()=>{const o=t.getAttribute('aria-expanded')!=='true';t.setAttribute('aria-expanded',String(o));b.hidden=!o;})}
for(const p of document.querySelectorAll('pre'))p.tabIndex=0;</script></body></html>`;
const long = 'x'.repeat(400);
const pages = {
	// The name is only the title, but the button shows the summary too; the code block takes focus
	// only from the script.
	'/bad/': card((id) => `<button type="button" class="change-toggle" aria-expanded="true" aria-controls="${id}-body" aria-labelledby="${id}-t"><span id="${id}-t">Title</span> <span>and more text shown</span></button>`, `<pre>${long}</pre>`),
	// A card whose button opens nothing.
	'/stuck/': card((id) => `<button type="button" class="change-toggle" aria-expanded="true" aria-controls="${id}-nothing">Title</button>`, '<p>x</p>'),
	'/good/': card((id) => `<button type="button" class="change-toggle" aria-expanded="true" aria-controls="${id}-body">Title</button>`, `<pre tabindex="0" role="region" aria-label="Code example">${long}</pre>`),
};
const server = createServer((request, response) => {
	const page = pages[request.url];
	response.writeHead(page ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
	response.end(page ?? 'not found');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
try {
	const rules = async (path, state) => {
		const result = await scanState(context, base + path, state);
		return { problem: result.problem, rules: result.violations.map((violation) => violation.rule).sort() };
	};
	assert.deepEqual(await rules('/bad/', 'no-js'), { problem: null, rules: ['label-content-name-mismatch', 'scrollable-region-focusable'] }, 'no-js: both defects');
	assert.deepEqual(await rules('/bad/', 'js'), { problem: null, rules: ['label-content-name-mismatch'] }, 'js: the script hides the code, the name defect stays');
	assert.deepEqual((await rules('/stuck/', 'js-expanded')).problem, 'the card did not open', 'a card that does not open is not scanned as open');
	for (const state of ['no-js', 'js', 'js-expanded']) assert.deepEqual(await rules('/good/', state), { problem: null, rules: [] }, `good page, ${state}`);
	console.log('axe-scan: fails the known-bad fixture in the right states, refuses a card that did not open, passes the fixed one');
} finally {
	await browser.close();
	server.close();
}
