#!/usr/bin/env node
// The "Using the Studio" screenshots, taken from a real Studio. The script brings a Colophon to the
// states the guides show (a Field notes project with recipes, an image, three people, review
// stages, publish requests, releases, a schedule, comments, a task, a translation, a rollback) and
// photographs each one.
//
//   node scripts/capture-studio-screens.mjs --base http://localhost:8080 --compose-dir path/to/deploy/quickstart
//   node scripts/capture-studio-screens.mjs --base … --compose-dir … --only media,rollback
//
// Start from a fresh quick-start Colophon (nobody signed up yet): the script signs Akira Shirase up
// and becomes the administrator with the setup code from `docker compose logs colophon` in
// --compose-dir. Run again on the same Colophon, it signs in and reuses what it made, so one
// section can be taken again with --only. Light theme, en-GB, UTC, one browser; WebP files go to
// public/screens/studio/.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const base = option('base', 'http://localhost:8080');
const composeDir = option('compose-dir', '.');
const only = option('only', '')
	.split(',')
	.filter((name) => name !== '');
const out = new URL('../public/screens/studio/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

/** The people in the guides. Akira owns the project; Mina writes; Kai reviews and publishes. */
const people = {
	akira: { name: 'Akira Shirase', email: 'akira@example.com', password: 'quick-start-password' },
	mina: { name: 'Mina Ito', email: 'mina@example.com', password: 'mina-example-password', role: 'editor' },
	kai: { name: 'Kai Tan', email: 'kai@example.com', password: 'kai-example-password', role: 'publisher' },
};

const browser = await chromium.launch();
const contextOptions = {
	viewport: { width: 1200, height: 760 },
	deviceScaleFactor: 2,
	colorScheme: 'light',
	locale: 'en-GB',
	timezoneId: 'UTC',
};

/** One signed-in person: their own browser context and page, and the API as them. */
class Person {
	constructor(key, context, page) {
		this.key = key;
		this.who = people[key];
		this.context = context;
		this.page = page;
	}

	async settle(ms = 600) {
		await this.page.waitForLoadState('networkidle');
		await this.page.waitForTimeout(ms);
	}

	async go(path, ms = 900) {
		await this.page.goto(`${base}/studio${path}`);
		await this.settle(ms);
	}

	/** A management API call from inside the page, as the Studio makes it: the session cookie, and
	 *  the CSRF token on writes. Throws on a failure unless `allow` lists its status. */
	async api(method, path, body, { headers = {}, allow = [] } = {}) {
		const answer = await this.page.evaluate(
			async ([method, path, body, extra]) => {
				const csrf = document.cookie.split('; ').find((pair) => pair.startsWith('colophon_csrf='))?.slice(14) ?? '';
				const headers = { ...extra };
				if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
				if (body !== undefined) headers['Content-Type'] = 'application/json';
				if (method === 'POST' && headers['Idempotency-Key'] === undefined) headers['Idempotency-Key'] = crypto.randomUUID();
				const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
				const text = await response.text();
				return { status: response.status, etag: response.headers.get('etag'), generation: response.headers.get('colophon-generation'), text };
			},
			[method, path, body, headers],
		);
		const json = answer.text === '' ? null : JSON.parse(answer.text);
		if (answer.status >= 400 && !allow.includes(answer.status)) {
			throw new Error(`${method} ${path} → ${answer.status} ${answer.text}`);
		}
		return { ...answer, json, data: json?.data };
	}
}

function setupCode() {
	const logs = execFileSync('docker', ['compose', 'logs', 'colophon'], { cwd: composeDir, encoding: 'utf8' });
	const code = [...logs.matchAll(/Setup code: ([0-9A-Z-]+)/g)].at(-1)?.[1];
	if (!code) throw new Error('no setup code in docker compose logs colophon');
	return code;
}

async function signIn(key) {
	const context = await browser.newContext(contextOptions);
	const page = await context.newPage();
	const person = new Person(key, context, page);
	await person.go('/');
	const { who } = person;
	const signedUp = await page.evaluate(async ([email, password]) => {
		const response = await fetch('/auth/signin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		return response.ok;
	}, [who.email, who.password]);
	if (!signedUp) {
		// A fresh Colophon asks for the first account; later people create theirs from the sign-in form.
		if ((await page.getByLabel('Your name').count()) === 0) {
			await page.getByRole('button', { name: 'Create one' }).click();
		}
		await page.getByLabel('Your name').fill(who.name);
		await page.getByLabel('Email').fill(who.email);
		await page.getByLabel('Password').fill(who.password);
		await page.getByRole('button', { name: 'Create account and continue' }).click();
		await person.settle(1200);
	}
	// The first account becomes the administrator with the setup code the server printed.
	const me = (await person.api('GET', '/me')).data;
	if (key === 'akira' && !me.installation.has_administrator) {
		await person.go('/');
		await page.getByLabel('Setup code').fill(setupCode());
		await page.getByRole('button', { name: 'Become the administrator' }).click();
		await person.settle(1200);
	}
	await person.go('/');
	return person;
}

/** The reader's server is on :8080; this one may run elsewhere. Show the address the reader will see. */
async function asReaderSeesIt(page) {
	const from = new URL(base).host;
	await page.evaluate(([from, to]) => {
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
		}
		for (const input of document.querySelectorAll('input, textarea')) {
			if (input.value.includes(from)) input.value = input.value.replaceAll(from, to);
		}
	}, [from, 'localhost:8080']);
}

/** Saves a WebP of the page, or of `target` (a dialog, a panel) when the whole page would be mostly empty. */
async function shot(person, name, target, { pad = 0 } = {}) {
	const { page } = person;
	await asReaderSeesIt(page);
	await page.mouse.move(0, 0);
	let png;
	if (target && pad > 0) {
		const box = await target.boundingBox();
		const viewport = page.viewportSize();
		const x = Math.max(0, box.x - pad);
		const y = Math.max(0, box.y - pad);
		png = await page.screenshot({
			animations: 'disabled',
			clip: { x, y, width: Math.min(viewport.width - x, box.width + pad * 2), height: Math.min(viewport.height - y, box.height + pad * 2) },
		});
	} else {
		png = target ? await target.screenshot({ animations: 'disabled' }) : await page.screenshot({ animations: 'disabled' });
	}
	await sharp(png).webp({ quality: 78 }).toFile(`${out}${name}.webp`);
	console.log(`screens: studio/${name}.webp`);
}

const wanted = (section) => only.length === 0 || only.includes(section);

// ---------------------------------------------------------------------------------------------
// Setup: the project, its content type and its people. Each step looks first, so it runs again.

const akira = await signIn('akira');
let me = (await akira.api('GET', '/me')).data;
let project = me.projects.find((item) => item.slug === 'field-notes')?.id;
if (project === undefined) {
	project = (await akira.api('POST', '/api/v1/projects', { slug: 'field-notes', name: 'Field notes' })).data.id;
}
const env = `/api/v1/projects/${project}/environments/production`;

const RECIPES = {
	name: 'Recipes',
	title_field: 'dish',
	fields: [
		{ id: 'dish', label: 'Dish', type: 'text', required: true, max_chars: 200, multiline: false },
		{ id: 'minutes', label: 'Minutes', type: 'number', required: false, integer: true },
		{ id: 'method', label: 'Method', type: 'rich_text', required: false },
		{ id: 'photo', label: 'Photo', type: 'asset', required: false, many: false },
		{ id: 'goes_with', label: 'Goes well with', type: 'reference', required: false, to: 'recipes', many: true },
	],
};
const types = (await akira.api('GET', `${env}/content-types`)).data;
if (!types.some((type) => type.slug === 'recipes')) {
	await akira.api('POST', `${env}/content-types`, { slug: 'recipes', definition: RECIPES });
}

/** Mina and Kai join through invitation links, as the Members page makes them. */
async function member(key) {
	const members = (await akira.api('GET', `/api/v1/projects/${project}/members`)).data;
	const person = await signIn(key);
	if (!members.some((item) => item.display_name === person.who.name)) {
		const invitation = (await akira.api('POST', `/api/v1/projects/${project}/invitations`, { role: person.who.role, label: person.who.name })).data;
		await person.page.goto(invitation.link.replace(/^https?:\/\/[^/]+/, base));
		await person.settle(1000);
		await person.page.getByRole('button', { name: 'Join', exact: true }).click();
		await person.settle(1200);
	}
	return person;
}
const mina = await member('mina');
const kai = await member('kai');

/** Entries by title, made through the API when missing. */
async function entry(collection, content, as = akira) {
	const list = (await as.api('GET', `${env}/collections/${collection}/entries?limit=100`)).data;
	const title = content.dish ?? content.title;
	const found = list.find((item) => item.revision.title === title);
	if (found) return found.id;
	return (await as.api('POST', `${env}/collections/${collection}/entries`, content)).data.id;
}

/** A rich-text value of plain paragraphs. */
const paragraphs = (...texts) => ({
	schema: 'colophon/rich-text',
	version: 1,
	doc: { type: 'doc', content: texts.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) },
});
