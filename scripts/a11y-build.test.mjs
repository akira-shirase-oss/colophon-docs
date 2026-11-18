// The build-time accessibility fixes and the scan helper's no-JavaScript transform.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withoutScripts, TAGS, FAILING } from './axe-scan.mjs';
import { focusableTables } from './focusable-tables.mjs';
import { focusableCode } from '../src/lib/focusable-code.mjs';

test('the scan runs the pinned WCAG tags and fails on serious and critical', () => {
	assert.deepEqual(TAGS, ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
	assert.deepEqual(FAILING, ['serious', 'critical']);
});

test('without scripts, a page keeps everything but its scripts', () => {
	const html = '<p>a</p><script>alert(1)</script><SCRIPT type="module" src="/x.js"></SCRIPT><script src="/y.js" /><p>b</p>';
	assert.equal(withoutScripts(html), '<p>a</p><p>b</p>');
});

test('every table takes focus, once, and one that already does is left alone', () => {
	assert.equal(focusableTables('<table><tr></tr></table>'), '<table tabindex="0"><tr></tr></table>');
	assert.equal(focusableTables('<table class="x">'), '<table tabindex="0" class="x">');
	assert.equal(focusableTables('<table tabindex="-1">'), '<table tabindex="-1">');
	assert.equal(focusableTables(focusableTables('<table>')), '<table tabindex="0">');
});

test("a code block's pre takes focus and is a region named Code example", () => {
	const pre = { type: 'element', tagName: 'pre', properties: { dataLanguage: 'sh' }, children: [] };
	const blockAst = { type: 'element', tagName: 'figure', properties: {}, children: [{ type: 'element', tagName: 'div', properties: {}, children: [pre] }] };
	focusableCode().hooks.postprocessRenderedBlock({ renderData: { blockAst } });
	assert.deepEqual(pre.properties, { dataLanguage: 'sh', tabIndex: 0, role: 'region', ariaLabel: 'Code example' });
});
