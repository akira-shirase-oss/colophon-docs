#!/usr/bin/env node
// The quick start's screenshots, taken from a real Studio: a fresh Colophon (the quick start's
// compose file, nobody signed up yet), driven through Parts A to C exactly as the page says.
//
//   node scripts/capture-screens.mjs --base http://localhost:8080 --compose-dir path/to/deploy/quickstart
//
// It needs `docker compose logs colophon` to work in --compose-dir (for the setup code), and
// writes WebP files to public/screens/quick-start/. Light theme, en-GB, UTC, one browser.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const base = option('base', 'http://localhost:8080');
const composeDir = option('compose-dir', '.');
const out = new URL('../public/screens/quick-start/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 1200, height: 760 },
	deviceScaleFactor: 2,
	colorScheme: 'light',
	locale: 'en-GB',
	timezoneId: 'UTC',
});
const page = await context.newPage();
const settle = async (ms = 600) => {
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(ms);
};

/** The reader's server is on :8080; this one may run elsewhere. Show the address the reader will see. */
async function asReaderSeesIt() {
	const from = new URL(base).host;
	await page.evaluate(([from, to]) => {
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
		}
	}, [from, 'localhost:8080']);
	// No real secret in a published image: a token on screen becomes an obviously fake one of the same length.
	await page.evaluate(() => {
		const fake = (secret) => secret.slice(0, 'colophon_api_'.length) + 'EXAMPLEnotARealToken'.repeat(4).slice(0, secret.length - 'colophon_api_'.length);
		const pattern = /colophon_api_[A-Za-z0-9_-]{16,}/g;
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (node.nodeValue?.includes('colophon_api_')) node.nodeValue = node.nodeValue.replace(pattern, fake);
		}
		for (const input of document.querySelectorAll('input, textarea')) {
			if (input.value.includes('colophon_api_')) input.value = input.value.replace(pattern, fake);
		}
	});
}

async function shot(name, target) {
	await asReaderSeesIt();
	const png = target ? await target.screenshot({ animations: 'disabled' }) : await page.screenshot({ animations: 'disabled' });
	await sharp(png).webp({ quality: 78 }).toFile(`${out}${name}.webp`);
	console.log(`screens: ${name}.webp`);
}

// Part A
await page.goto(`${base}/studio/`);
await settle();
await page.getByLabel('Your name').fill('Akira Shirase');
await page.getByLabel('Email').fill('akira@example.com');
await page.getByLabel('Password').fill('quick-start-password');
await shot('welcome');
await page.getByRole('button', { name: 'Create account and continue' }).click();
await settle(1200);
const logs = execFileSync('docker', ['compose', 'logs', 'colophon'], { cwd: composeDir, encoding: 'utf8' });
const code = [...logs.matchAll(/Setup code: ([0-9A-Z-]+)/g)].at(-1)?.[1];
if (!code) throw new Error('no setup code in docker compose logs colophon');
await page.getByLabel('Setup code').fill(code);
await shot('setup-code');
await page.getByRole('button', { name: 'Become the administrator' }).click();
await settle(1200);

// Part B
await page.getByLabel('Name', { exact: true }).fill('Field notes');
await settle(300);
await shot('new-project');
await page.getByRole('button', { name: 'Create project' }).click();
await settle(1500);
const project = page.url().split('/projects/')[1].split('/')[0];

await page.goto(`${base}/studio/projects/${project}/settings/types`);
await settle();
await page.getByRole('button', { name: 'New content type' }).click();
await settle(400);
const dialog = page.getByRole('dialog');
await dialog.getByLabel('Name', { exact: true }).fill('Recipes');
await dialog.getByLabel('What is each one called?').fill('Dish');
await dialog.getByRole('button', { name: 'Create' }).click();
await settle(1200);
for (const [kind, label, whole] of [
	['Number', 'Minutes', true],
	['Rich text', 'Method', false],
]) {
	await page.getByRole('button', { name: 'Add a field' }).click();
	await settle(300);
	await page.getByRole('button', { name: new RegExp(`^${kind}`) }).click();
	await settle(300);
	await page.getByRole('dialog').getByLabel('Label').fill(label);
	if (whole) await page.getByLabel('Whole numbers only').check();
	await page.getByRole('button', { name: 'Add field' }).click();
	await settle(500);
}
await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save' }).click();
await settle(1500);
await shot('content-type');

await page.goto(`${base}/studio/projects/${project}/recipes`);
await settle();
await page.getByRole('button', { name: 'New entry' }).click();
await settle(400);
await page.getByRole('dialog').getByLabel('Dish').fill('Lemon tart');
await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
await settle(1500);
await page.getByLabel('Minutes (optional)').fill('45');
await page.getByRole('textbox', { name: 'Method' }).click();
await page.keyboard.type('Blind-bake the pastry, then fill it with lemon curd and bake until just set.');
await settle(3000);
await shot('entry');
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await settle(2500);
await shot('published');
await page.getByRole('complementary', { name: 'Saving and publishing' }).getByRole('link', { name: 'Release 1' }).first().click();
await settle(1500);
await shot('receipt');

// Part C
await page.goto(`${base}/studio/projects/${project}/settings/tokens`);
await settle();
await page.getByRole('button', { name: 'New token' }).first().click();
await settle(500);
await page.getByRole('dialog').getByLabel('Name').fill('Recipe site');
await page.getByRole('dialog').getByLabel('Description (optional)').fill('Reads recipes and saves drafts from the import script.');
await page.getByRole('radio', { name: /Full access/ }).check();
await shot('token-form', page.getByRole('dialog'));
await page.getByRole('button', { name: 'Make the token' }).click();
await settle(1200);
await shot('token-secret', page.getByTestId('token-secret'));

await page.goto(`${base}/studio/projects/${project}/settings`);
await settle();
await page.getByText('Technical details').click();
await settle(400);
await shot('project-id');

await browser.close();
