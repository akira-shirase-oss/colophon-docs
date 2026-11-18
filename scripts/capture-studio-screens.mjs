#!/usr/bin/env node
// The "Using the Studio" screenshots, taken from a real Studio. The script brings a Colophon to the
// states the guides show (a Field notes project with recipes, pictures, three people, review
// stages, publish requests, releases, a schedule, comments, tasks, a translation and a rollback)
// and photographs each one.
//
//   node scripts/capture-studio-screens.mjs --base http://localhost:8080 --compose-dir path/to/deploy/quickstart
//   node scripts/capture-studio-screens.mjs --base … --compose-dir … --only media,rollback
//
// Start from a fresh quick-start Colophon (nobody signed up yet): the script signs Akira Shirase up
// and makes them the administrator with the setup code from `docker compose logs colophon`, run in
// --compose-dir (set COMPOSE_PROJECT_NAME as for the stack, if it has one). Mina Ito (Editor) and
// Kai Tan (Publisher) sign up and join through invitation links. Run again on the same Colophon, it
// signs in and reuses what it made, so sections can be taken again with --only: preview, media,
// writing, rich-text, publishing, scheduling, history, comments, languages, linked, rollback,
// settings, members. The guides' release numbers (the rollback restores release 4 as release 7)
// are those of a first run on a fresh Colophon.
//
// Light theme, en-GB, UTC, one browser. Pages are 1200×760, or 1440×900 where the entry editor's
// side panel is shown; WebP files go to public/screens/studio/.
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
	// No real secret in a published image: an invitation link's secret becomes an obviously fake one.
	await page.evaluate(() => {
		const pattern = /invite#[A-Za-z0-9_-]+/g;
		const fake = (match) => 'invite#' + 'EXAMPLEnotARealSecret'.repeat(8).slice(0, match.length - 'invite#'.length);
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (node.nodeValue?.includes('invite#')) node.nodeValue = node.nodeValue.replace(pattern, fake);
		}
		for (const input of document.querySelectorAll('input, textarea')) {
			if (input.value.includes('invite#')) input.value = input.value.replace(pattern, fake);
		}
	});
}

/** The editor's side card (publishing, Locale, Versions) shows from 1280 pixels up; pages that
 *  have it are taken at this width. */
const WIDE = { width: 1440, height: 900 };
async function view(person, size = contextOptions.viewport) {
	await person.page.setViewportSize(size);
	await person.page.waitForTimeout(300);
}

/**
 * Saves a WebP of the page, or of `target` (a dialog, a panel) when the whole page would be mostly
 * empty. A target taller than the window gets a taller window first, so nothing sticky covers it.
 * `around` takes the smallest box holding several targets (a button and its open menu), plus `pad`
 * (and `below`, for a list that opens under them).
 */
async function shot(person, name, target, { around = [], pad = 0, below = 0, full = false } = {}) {
	const { page } = person;
	await asReaderSeesIt(page);
	await page.mouse.move(0, 0);
	// A toast from the step before isn't part of what the guide shows.
	await page.evaluate(() => document.querySelectorAll('[data-sonner-toast]').forEach((toast) => toast.remove()));
	const before = page.viewportSize();
	let png;
	if (around.length > 0) {
		const boxes = await Promise.all(around.map((item) => item.boundingBox()));
		const x = Math.max(0, Math.min(...boxes.map((box) => box.x)) - pad);
		const y = Math.max(0, Math.min(...boxes.map((box) => box.y)) - pad);
		const right = Math.min(before.width, Math.max(...boxes.map((box) => box.x + box.width)) + pad);
		const bottom = Math.min(before.height, Math.max(...boxes.map((box) => box.y + box.height)) + pad + below);
		png = await page.screenshot({ animations: 'disabled', clip: { x, y, width: right - x, height: bottom - y } });
	} else if (target) {
		const box = await target.boundingBox();
		if (box && box.height + 160 > before.height) {
			const top = await target.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
			await page.setViewportSize({ width: before.width, height: Math.min(4000, Math.ceil(top + box.height + 80)) });
			await page.evaluate(() => window.scrollTo(0, 0));
			await page.waitForTimeout(400);
		}
		png = await target.screenshot({ animations: 'disabled' });
		await page.setViewportSize(before);
	} else {
		png = await page.screenshot({ animations: 'disabled', fullPage: full });
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

// ---------------------------------------------------------------------------------------------
// Sample pictures, drawn here so the repository holds no photographs: flat illustrations of the
// dishes, as JPEG files the media library checks like any upload.

const PICTURES = {
	'lemon-tart.jpg': { plate: '#f4efe6', ground: '#3d5a4c', crust: '#d9a35b', fill: '#f2d64b', top: '#fff6c9', dots: '#ffffff' },
	'lemon-tart-2.jpg': { plate: '#efe7db', ground: '#2f4a5c', crust: '#cf9447', fill: '#f5cf3a', top: '#fff2b3', dots: '#fffbe8' },
	'plum-crumble.jpg': { plate: '#ece4f0', ground: '#4b3a52', crust: '#c58b4e', fill: '#7b2d5c', top: '#d9b27c', dots: '#e8cfa0' },
	'shortbread.jpg': { plate: '#f3ece0', ground: '#5c4733', crust: '#e2b56d', fill: '#efcf8f', top: '#f6deaa', dots: '#fff4dc' },
};

async function picture(name) {
	const c = PICTURES[name];
	const dots = Array.from({ length: 14 }, (_, i) => {
		const angle = (i / 14) * Math.PI * 2;
		return `<circle cx="${800 + Math.cos(angle) * 250}" cy="${600 + Math.sin(angle) * 175}" r="16" fill="${c.dots}" opacity="0.85"/>`;
	}).join('');
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
		<rect width="1600" height="1200" fill="${c.ground}"/>
		<ellipse cx="800" cy="640" rx="560" ry="400" fill="#000" opacity="0.18"/>
		<ellipse cx="800" cy="610" rx="540" ry="380" fill="${c.plate}"/>
		<ellipse cx="800" cy="600" rx="400" ry="280" fill="${c.crust}"/>
		<ellipse cx="800" cy="600" rx="350" ry="240" fill="${c.fill}"/>
		<ellipse cx="760" cy="570" rx="220" ry="130" fill="${c.top}" opacity="0.6"/>
		${dots}
	</svg>`;
	return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

// ---------------------------------------------------------------------------------------------
// Helpers over the management API, used to reach a state before it is photographed.

const releases = async () => Number((await akira.api('GET', `${env}/releases`)).generation ?? '0');

/** Review stages for the guides: Editorial, and a Fact check someone other than the sender decides. */
const STAGES = [
	{ key: 'editorial', name: 'Editorial', different_reviewer: false },
	{ key: 'fact-check', name: 'Fact check', different_reviewer: true },
];
{
	const current = await akira.api('GET', `${env}/review-stages`);
	if (current.data.stages.length === 0) {
		await akira.api('PUT', `${env}/review-stages`, { stages: STAGES }, { headers: { 'If-Match': current.etag, 'Idempotency-Key': crypto.randomUUID() } });
	}
}

/** Makes a publish request as `by`, sends it for review, has each stage approved (Kai decides the
 *  ones that need someone other than the sender), and, unless `publish` is false, publishes it. */
async function publishVia(title, { entries = [], unpublish = [], by = akira, reviewer = kai, publish = true } = {}) {
	let made = (await by.api('POST', `${env}/changesets`, { title, entries, unpublish })).data;
	const step = async (who, action, body) =>
		(made = (await who.api('POST', `${env}/changesets/${made.id}/${action}`, body, { headers: { 'If-Match': `"${made.hash}"` } })).data);
	if (made.status.state === 'open') await step(by, 'submit');
	if (made.stages.length === 0) {
		await step(by, 'reviews', { decision: 'approve', comment: '' });
	} else {
		for (const stage of made.stages) {
			if (stage.state === 'approved') continue;
			await step(stage.different_reviewer ? reviewer : by, 'reviews', { decision: 'approve', comment: '', stage: stage.key });
		}
	}
	if (!publish) return made;
	const on = await releases();
	const done = await by.api('POST', `${env}/changesets/${made.id}/publish`, { base_generation: on }, {
		headers: { 'If-Match': `"${made.hash}"`, 'Idempotency-Key': crypto.randomUUID() },
	});
	return { ...made, generation: done.data.generation };
}

/** The entry's draft and its ETag, for a save that names the version it builds on. */
async function draft(collection, id, as = akira) {
	const read = await as.api('GET', `${env}/collections/${collection}/entries/${id}`);
	return { content: read.data.content, etag: read.etag, data: read.data };
}

async function save(collection, id, change, as = akira) {
	const { content, etag } = await draft(collection, id, as);
	return as.api('PUT', `${env}/collections/${collection}/entries/${id}`, { ...content, ...change }, {
		headers: { 'If-Match': etag, 'Idempotency-Key': crypto.randomUUID() },
	});
}

/** Whether the entry's current draft is what readers get. */
async function live(collection, id) {
	const list = (await akira.api('GET', `${env}/collections/${collection}/entries?limit=100`)).data;
	const found = list.find((item) => item.id === id);
	return found?.published?.revision_id === found?.revision.id;
}

/** Uploads through the media library's own file input, then waits until the upload is checked. */
async function upload(name) {
	const assets = (await akira.api('GET', `${env}/assets?limit=100`)).data;
	const found = assets.find((asset) => asset.file_name === name && asset.state !== 'deleted' && asset.state !== 'deleting');
	if (found) return found;
	await akira.go(`/projects/${project}/media`);
	await akira.page.locator('input[type=file]').first().setInputFiles({ name, mimeType: 'image/jpeg', buffer: await picture(name) });
	for (let tries = 0; tries < 60; tries += 1) {
		await akira.page.waitForTimeout(500);
		const now = (await akira.api('GET', `${env}/assets?limit=100`)).data.find((asset) => asset.file_name === name);
		if (now?.state === 'usable') return now;
	}
	throw new Error(`${name} wasn't checked in time`);
}

async function describe(asset, metadata) {
	const now = (await akira.api('GET', `${env}/assets/${asset.id}`)).data;
	if (now.alt === metadata.alt && now.title === metadata.title) return now;
	return (await akira.api('PATCH', `${env}/assets/${asset.id}`, metadata, {
		headers: { 'If-Match': `"${now.metadata_version}"`, 'Idempotency-Key': crypto.randomUUID() },
	})).data;
}

const editorOf = (collection, id) => `/projects/${project}/${collection}/${id}`;

// ---------------------------------------------------------------------------------------------
// The content every guide shows: three pictures, Lemon curd, and a Lemon tart that uses them.

const tartPhoto = await describe(await upload('lemon-tart.jpg'), {
	alt: 'A lemon tart on a white plate, its top dotted with cream',
	title: 'Lemon tart, whole',
	credit: 'Photo: Akira Shirase',
	tags: ['dessert', 'citrus'],
});
const crumblePhoto = await describe(await upload('plum-crumble.jpg'), {
	alt: 'A dish of plum crumble with a golden topping',
	title: 'Plum crumble',
	credit: 'Photo: Mina Ito',
	tags: ['dessert', 'autumn'],
});
await describe(await upload('shortbread.jpg'), {
	alt: 'Round shortbread on a cream plate',
	title: 'Shortbread',
	credit: 'Photo: Akira Shirase',
	tags: ['baking'],
});

const text = (value, marks) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });
const para = (...content) => ({ type: 'paragraph', content });
const METHOD = {
	schema: 'colophon/rich-text',
	version: 1,
	doc: {
		type: 'doc',
		content: [
			{ type: 'heading', attrs: { level: 2 }, content: [text('Pastry')] },
			para(text('Rub the butter into the flour, add the yolk and a spoon of cold water, and rest the dough for '), text('30 minutes', [{ type: 'bold' }]), text('.')),
			{
				type: 'orderedList',
				content: [
					{ type: 'listItem', content: [para(text('Line a 23 cm tin and blind-bake at 190 °C for 15 minutes.'))] },
					{ type: 'listItem', content: [para(text('Whisk the eggs, sugar, cream and the juice of four lemons.'))] },
					{ type: 'listItem', content: [para(text('Fill the case and bake at 150 °C until just set.'))] },
				],
			},
			{ type: 'callout', attrs: { tone: 'tip' }, content: [para(text('Take it out while the middle still wobbles: it sets as it cools.'))] },
			{ type: 'image', attrs: { assetId: tartPhoto.id, alt: 'A lemon tart on a white plate, its top dotted with cream' } },
			para(text('Serve with '), text('lemon curd', [{ type: 'link', attrs: { href: '/recipes/lemon-curd' } }]), text(' and a spoon of crème fraîche.')),
		],
	},
};

const curd = await entry('recipes', { dish: 'Lemon curd', minutes: 20, method: paragraphs('Whisk the yolks, sugar and lemon juice over a low heat, then beat in the butter.') });
if (!(await live('recipes', curd))) await publishVia('Lemon curd', { entries: [curd] });
const tart = await entry('recipes', { dish: 'Lemon tart', minutes: 45, method: METHOD, photo: tartPhoto.id, goes_with: [curd] });
if (!(await live('recipes', tart))) await publishVia('Lemon tart', { entries: [tart] });


const PREVIEW_ADDRESS = 'https://recipes.example.com/api/preview?code={code}&path=/recipes/{id}';

// ---------------------------------------------------------------------------------------------
// Preview: the website connection's preview address, then the Preview menu on an entry.

if (wanted('preview')) {
	const { page } = akira;
	await view(akira, WIDE);
	await akira.go(`/projects/${project}/settings/connections`, 1200);
	const address = page.getByLabel('Preview address');
	if ((await address.inputValue()) !== PREVIEW_ADDRESS) {
		await address.fill(PREVIEW_ADDRESS);
		await page.getByTestId('preview-address-save').click();
		await akira.settle(1200);
	}
	await page.locator('body').click({ position: { x: 5, y: 300 } });
	await shot(akira, 'preview-address', page.getByTestId('preview-target'));

	await akira.go(editorOf('recipes', curd), 1800);
	await page.getByTestId('preview-menu').click();
	await akira.settle(500);
	await shot(akira, 'preview-menu', undefined, { around: [page.getByTestId('preview-menu'), page.getByRole('menu')], pad: 16 });
	await page.keyboard.press('Escape');
	await view(akira);
}
{
	// Every later editor shot shows Preview ready to use.
	const target = await akira.api('GET', `${env}/preview-target`);
	if (target.data?.url_template !== PREVIEW_ADDRESS) await akira.api('PUT', `${env}/preview-target`, { url_template: PREVIEW_ADDRESS });
}

// ---------------------------------------------------------------------------------------------
// Media library

if (wanted('media')) {
	const { page } = akira;
	await akira.go(`/projects/${project}/media`, 1500);
	await shot(akira, 'media-library');
	await page.getByRole('button', { name: 'Details of lemon-tart.jpg' }).click();
	await akira.settle(1200);
	const sheet = page.getByRole('dialog');
	await sheet.getByText("Where it's used").scrollIntoViewIfNeeded();
	await page.waitForTimeout(500);
	await shot(akira, 'media-details', sheet);
	await page.keyboard.press('Escape');
}

// ---------------------------------------------------------------------------------------------
// Writing and autosave

if (wanted('writing')) {
	const { page } = akira;
	await view(akira, WIDE);
	await akira.go(editorOf('recipes', curd), 1800);
	await shot(akira, 'editor');

	// A required field emptied: the save is refused, and the field says why.
	const dish = page.getByLabel('Dish', { exact: true });
	await dish.fill('');
	await page.waitForTimeout(2500);
	await shot(akira, 'not-saved');
	await dish.fill('Lemon curd');
	await page.waitForTimeout(2500);

	// Someone else saves first: Mina changes the minutes while Akira's page is open.
	const minutes = (await draft('recipes', curd)).content.minutes;
	await save('recipes', curd, { minutes: minutes === 25 ? 20 : 25 }, mina);
	await page.getByLabel(/^Minutes/).fill('15');
	await page.waitForTimeout(3000);
	await shot(akira, 'conflict', page.getByTestId('conflict'));
	await page.getByRole('button', { name: 'Use their version' }).click();
	await page.waitForTimeout(1500);
	await view(akira);
}

// ---------------------------------------------------------------------------------------------
// Rich text and images

if (wanted('rich-text')) {
	const { page } = akira;
	await view(akira, WIDE);
	await akira.go(editorOf('recipes', tart), 1800);
	const method = page.locator('[data-testid="rich-field"][data-field="method"]');
	await shot(akira, 'rich-text', method);

	await method.getByRole('button', { name: 'Image', exact: true }).click();
	await akira.settle(1200);
	await shot(akira, 'insert-image', page.getByRole('dialog'));
	await page.getByRole('dialog').getByRole('button', { name: /plum-crumble/ }).first().click();
	await akira.settle(800);
	await shot(akira, 'describe-image', page.getByRole('dialog'));
	await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
	await view(akira);
}

// ---------------------------------------------------------------------------------------------
// Publishing and review: Mina asks for review, Kai approves each stage and publishes.

const crumble = await entry('recipes', { dish: 'Plum crumble', minutes: 50, photo: crumblePhoto.id, method: paragraphs('Halve the plums, scatter them with sugar and cover them with a buttery crumble.') }, mina);

/** The newest publish request with `title` in one of `states`, if any. */
async function request(title, states) {
	const list = (await akira.api('GET', `${env}/changesets`)).data;
	return list.find((item) => item.title === title && states.includes(item.status.state));
}

if (wanted('publishing')) {
	const { page } = mina;
	await save('recipes', crumble, { minutes: 45 + Math.floor(Math.random() * 10) }, mina);
	await view(mina, WIDE);
	await mina.go(editorOf('recipes', crumble), 1800);
	await shot(mina, 'ask-for-review', page.getByTestId('entry-panel'));
	await page.getByTestId('publish-button').click();
	await mina.settle(1500);
	await view(mina);

	const sent = await request('Plum crumble', ['awaiting_review']);
	await view(kai, WIDE);
	await kai.go(`/projects/${project}/changesets/${sent.id}`, 1800);
	await kai.page.getByLabel('Comment (optional)').fill('Checked the oven temperature against the test bake.');
	await shot(kai, 'publish-request', undefined, { full: true });
	for (const stage of ['Editorial', 'Fact check']) {
		const deciding = kai.page.getByTestId('review-stage');
		await deciding.selectOption(await deciding.locator('option', { hasText: stage }).getAttribute('value'));
		await kai.page.getByRole('button', { name: 'Approve this version' }).click();
		await kai.settle(1200);
	}
	await kai.page.getByRole('button', { name: 'Publish', exact: true }).click();
	await kai.settle(2000);
	await shot(kai, 'request-published', undefined, { full: true });
	await view(kai);

	// One request the reviewer sent back, so the list shows more than one state.
	const fool = await entry('recipes', { dish: 'Rhubarb fool', minutes: 20, method: paragraphs('Poach the rhubarb, cool it and fold it through whipped cream.') }, mina);
	if (!(await request('Rhubarb fool', ['changes_requested']))) {
		let made = (await mina.api('POST', `${env}/changesets`, { title: 'Rhubarb fool', entries: [fool], unpublish: [] })).data;
		made = (await mina.api('POST', `${env}/changesets/${made.id}/submit`, undefined, { headers: { 'If-Match': `"${made.hash}"` } })).data;
		await kai.api('POST', `${env}/changesets/${made.id}/reviews`, { decision: 'request_changes', comment: 'Say how long the rhubarb poaches.', stage: 'editorial' }, { headers: { 'If-Match': `"${made.hash}"` } });
	}
	await akira.go(`/projects/${project}/changesets`, 1500);
	await shot(akira, 'publish-requests');
}

// ---------------------------------------------------------------------------------------------
// Scheduling an approved request

if (wanted('scheduling')) {
	const { page } = akira;
	const gooseberry = await entry('recipes', { dish: 'Gooseberry tart', minutes: 60, method: paragraphs('Top and tail the gooseberries, then bake them on a frangipane base.') });
	let approved = await request('Gooseberry tart', ['approved']);
	if (!approved) approved = await publishVia('Gooseberry tart', { entries: [gooseberry], publish: false });
	for (const pending of (await akira.api('GET', `${env}/schedules?changeset=${approved.id}`)).data.filter((item) => item.state === 'scheduled')) {
		await akira.api('DELETE', `${env}/schedules/${pending.id}`);
	}
	await view(akira, WIDE);
	await akira.go(`/projects/${project}/changesets/${approved.id}`, 1800);
	const panel = page.getByTestId('schedule-panel');
	const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
	await page.getByLabel('Date').fill(tomorrow);
	await page.getByLabel('Time', { exact: true }).fill('09:00');
	await page.getByLabel('Time zone').selectOption('Europe/London');
	await panel.getByRole('heading', { name: 'Schedule' }).click();
	await shot(akira, 'schedule-form', panel);

	// A time the clocks show twice: the panel asks which one.
	await page.getByLabel('Date').fill('2027-10-31');
	await page.getByLabel('Time', { exact: true }).fill('01:30');
	await panel.getByRole('button', { name: 'Schedule' }).click();
	await akira.settle(1000);
	await shot(akira, 'schedule-choice', panel);

	await page.getByLabel('Time zone').selectOption('Europe/London');
	await page.getByLabel('Date').fill(tomorrow);
	await page.getByLabel('Time', { exact: true }).fill('09:00');
	await panel.getByRole('button', { name: /^Schedule/ }).click();
	await akira.settle(1500);
	await shot(akira, 'schedule-pending', panel);
	await view(akira);
}

// ---------------------------------------------------------------------------------------------
// History: compare an older version with the draft

if (wanted('history')) {
	const { page } = akira;
	const minutes = (await draft('recipes', tart)).content.minutes;
	await save('recipes', tart, { minutes: minutes === 55 ? 50 : 55 });
	await view(akira, WIDE);
	await akira.go(editorOf('recipes', tart), 1800);
	await page.getByRole('tab', { name: /^History/ }).click();
	await akira.settle(600);
	await page.getByRole('button', { name: 'Compare with draft' }).last().click();
	await akira.settle(1200);
	await shot(akira, 'history', undefined, { around: [page.locator('#panel-history')], pad: 16 });
	await view(akira);
}

// ---------------------------------------------------------------------------------------------
// Comments and tasks

if (wanted('comments')) {
	const { page } = akira;
	const current = (await draft('recipes', crumble)).data.revision.id;
	const comments = (await akira.api('GET', `${env}/collections/recipes/entries/${crumble}/comments?limit=100`)).data;
	if (comments.length === 0) {
		const said = (await kai.api('POST', `${env}/collections/recipes/entries/${crumble}/comments`, { revision: current, body: 'Can we say which plums? Victoria plums hold their shape best.' })).data;
		await mina.api('POST', `${env}/collections/recipes/entries/${crumble}/comments/${said.id}/resolve`, undefined, { headers: { 'If-Match': `"${said.etag}"` } });
		await mina.api('POST', `${env}/collections/recipes/entries/${crumble}/comments`, { revision: current, body: 'The crumble topping needs a pinch of salt in the method.' });
	}
	await view(akira, WIDE);
	await akira.go(editorOf('recipes', crumble), 1800);
	await page.getByRole('tab', { name: /^Comments/ }).click();
	await akira.settle(800);
	await page.getByRole('textbox', { name: 'Write a comment' }).fill('Added the salt. Kai, can you check the oven temperature?');
	await shot(akira, 'comments', undefined, { around: [page.locator('#panel-comments')], pad: 16 });
	await view(akira);

	const tasks = (await akira.api('GET', `${env}/tasks?limit=100`)).data;
	const ids = Object.fromEntries((await akira.api('GET', `/api/v1/projects/${project}/members`)).data.map((item) => [item.display_name, item.identity_id]));
	if (tasks.length === 0) {
		await akira.api('POST', `${env}/tasks`, { entry: crumble, title: 'Add the oven temperature to the method', assignee: ids['Mina Ito'] });
		await akira.api('POST', `${env}/tasks`, { entry: tart, title: 'Check the baking times after the test bake', assignee: ids['Kai Tan'] });
		const done = (await akira.api('POST', `${env}/tasks`, { entry: curd, title: 'Photograph the curd in a jar', assignee: ids['Akira Shirase'] })).data;
		await akira.api('PATCH', `${env}/tasks/${done.id}`, { status: 'done' }, { headers: { 'If-Match': `"${done.etag}"`, 'Idempotency-Key': crypto.randomUUID() } });
	}
	await akira.go(`/projects/${project}/tasks`, 1500);
	await shot(akira, 'tasks');
}

// ---------------------------------------------------------------------------------------------
// Languages: an English entry and its French version

if (wanted('languages')) {
	const { page } = akira;
	const scones = await entry('recipes', { dish: 'Scones', minutes: 25, method: paragraphs('Rub the butter into the flour, add the milk and bake at 220 °C.') });
	const loaded = (await draft('recipes', scones)).data;
	if (loaded.locale !== 'en') {
		const { content, etag } = await draft('recipes', scones);
		await akira.api('PUT', `${env}/collections/recipes/entries/${scones}?locale=en`, content, { headers: { 'If-Match': etag, 'Idempotency-Key': crypto.randomUUID() } });
	}
	await view(akira, WIDE);
	let french = (await draft('recipes', scones)).data.localizations.find((item) => item.locale === 'fr')?.id;
	if (french === undefined) {
		await akira.go(editorOf('recipes', scones), 1800);
		await page.getByLabel('Locale of the new version').fill('fr');
		await page.getByRole('button', { name: 'Add version' }).click();
		await akira.settle(2000);
		french = page.url().split('/').at(-1);
		await page.getByLabel('Dish', { exact: true }).fill('Scones aux raisins');
		await page.waitForTimeout(2500);
	}
	await akira.go(editorOf('recipes', french), 1800);
	await shot(akira, 'versions', undefined, { around: [page.getByTestId('entry-details')], pad: 16 });
	await view(akira);
}

// ---------------------------------------------------------------------------------------------
// Linked entries: choosing entries in a field, and a linked entry that can't be taken down

if (wanted('linked')) {
	const { page } = akira;
	await view(akira, WIDE);
	await akira.go(editorOf('recipes', tart), 1800);
	const search = page.getByPlaceholder('Search Recipes by dish');
	const row = page.locator('.rule-dotted').filter({ has: page.getByText('Goes well with (optional)', { exact: true }) });
	await search.fill('tart');
	await akira.settle(1200);
	await shot(akira, 'link-picker', row);
	await search.fill('');

	await akira.go(editorOf('recipes', curd), 1800);
	await shot(akira, 'linked-from', page.getByTestId('linked-from'));
	await page.getByTestId('unpublish-button').click();
	await akira.settle(600);
	await shot(akira, 'still-linked', page.getByRole('alertdialog'));
	await page.getByRole('button', { name: 'Keep it' }).click();
	await view(akira);
}

// ---------------------------------------------------------------------------------------------
// Rollback: Apple cake and Pear tart go live together; Apple cake changes; Pear tart is taken
// down. Rolling back to the release where both were live restores Apple cake's old version, and
// Pear tart stays down.

if (wanted('rollback')) {
	const { page } = akira;
	const apple = await entry('recipes', { dish: 'Apple cake', minutes: 50, method: paragraphs('Fold sliced apples into a spiced sponge and bake for 50 minutes.') });
	const pear = await entry('recipes', { dish: 'Pear tart', minutes: 40, method: paragraphs('Fan poached pears over almond cream in a sweet pastry case.') });
	if ((await draft('recipes', apple)).content.minutes !== 50) await save('recipes', apple, { minutes: 50 });
	const both = (await publishVia('Apple cake and Pear tart', { entries: [apple, pear] })).generation;
	await save('recipes', apple, { minutes: 55 });
	await publishVia('Apple cake: a longer bake', { entries: [apple] });
	await publishVia('Unpublish: Pear tart', { unpublish: [pear] });

	await view(akira, WIDE);
	await akira.go(`/projects/${project}/releases/${both}`, 1800);
	await shot(akira, 'rollback-receipt');
	await page.getByTestId('rollback').click();
	await akira.settle(2500);
	await shot(akira, 'rollback-request', undefined, { full: true });
	const rollback = page.url().split('/').at(-1);

	// Reviewed and published like any other request, as a new release.
	let made = (await akira.api('GET', `${env}/changesets/${rollback}`)).data;
	const step = async (who, action, body) =>
		(made = (await who.api('POST', `${env}/changesets/${made.id}/${action}`, body, { headers: { 'If-Match': `"${made.hash}"` } })).data);
	await step(akira, 'submit');
	for (const stage of made.stages) await step(stage.different_reviewer ? kai : akira, 'reviews', { decision: 'approve', comment: '', stage: stage.key });
	await akira.api('POST', `${env}/changesets/${made.id}/publish`, { base_generation: await releases() }, {
		headers: { 'If-Match': `"${made.hash}"`, 'Idempotency-Key': crypto.randomUUID() },
	});
	await akira.go(`/projects/${project}/releases`, 1800);
	await shot(akira, 'releases');
	await akira.go(editorOf('recipes', pear), 1800);
	await shot(akira, 'rollback-pear', page.getByTestId('entry-panel'));
	await view(akira);
}

// ---------------------------------------------------------------------------------------------
// Settings

if (wanted('settings')) {
	const { page } = akira;
	await akira.go(`/projects/${project}/settings/stages`, 1500);
	await shot(akira, 'review-stages');
}

// ---------------------------------------------------------------------------------------------
// Members and roles

if (wanted('members')) {
	const { page } = akira;
	for (const invitation of (await akira.api('GET', `/api/v1/projects/${project}/invitations`)).data) {
		await akira.api('DELETE', `/api/v1/projects/${project}/invitations/${invitation.id}`);
	}
	await akira.go(`/projects/${project}/members`, 1500);
	await page.getByTestId('invite-member').click();
	await akira.settle(500);
	await page.getByLabel('Who is it for?').fill('Copy editor');
	await page.getByRole('dialog').getByLabel('Role', { exact: true }).selectOption('editor');
	await page.getByRole('dialog').getByRole('heading', { name: 'Invite a member' }).click();
	await shot(akira, 'invite', page.getByRole('dialog'));
	await page.getByRole('button', { name: 'Create invitation link' }).click();
	await akira.settle(1000);
	await shot(akira, 'invitation-ready', page.getByRole('dialog'));
	await page.getByRole('button', { name: 'Done' }).click();
	await akira.settle(800);
	await shot(akira, 'members', undefined, { full: true });

	const roles = (await akira.api('GET', `/api/v1/projects/${project}/roles`)).data;
	if (!roles.some((role) => role.key === 'recipe-tester')) {
		await akira.api('POST', `/api/v1/projects/${project}/roles`, {
			key: 'recipe-tester',
			name: 'Recipe tester',
			description: 'Tests recipes and corrects their timings.',
			permissions: [
				{ action: 'content.read', subject: 'recipes' },
				{ action: 'content.update', subject: 'recipes', fields: ['minutes'] },
				{ action: 'content.create', subject: 'recipes' },
				{ action: 'content.update', subject: 'recipes', condition: 'own' },
			],
		});
	}
	await akira.go(`/projects/${project}/settings/roles/recipe-tester`, 1500);
	await shot(akira, 'role-editor', undefined, { full: true });
	await akira.go(`/projects/${project}/settings/roles`, 1500);
	await shot(akira, 'roles');
}

await browser.close();
