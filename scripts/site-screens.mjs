#!/usr/bin/env node
// Screenshots of the built docs at 1440 and 390 px, light and dark, for a look before deploying.
//   node scripts/site-screens.mjs --base http://127.0.0.1:4321 --out DIR [paths...]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const base = option('base', 'http://127.0.0.1:4321');
const out = option('out', 'test-results/site');
const full = args.includes('--full');
const paths = args.filter((arg, i) => !arg.startsWith('--') && !['--base', '--out'].includes(args[i - 1]));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [width, height] of [[1440, 900], [390, 844]]) {
	for (const theme of ['light', 'dark']) {
		const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: 1 });
		await context.addInitScript((t) => { try { localStorage.setItem('starlight-theme', t); } catch {} }, theme);
		const page = await context.newPage();
		for (const path of paths.length ? paths : ['/']) {
			await page.goto(new URL(path, base).href);
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(path.includes('reference') ? 2500 : 300);
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			const name = `${path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${width}-${theme}.png`;
			await page.screenshot({ path: `${out}/${name}`, fullPage: full });
			console.log(`${name}${overflow > 0 ? `  OVERFLOW ${overflow}px` : ''}`);
		}
		await context.close();
	}
}
await browser.close();
