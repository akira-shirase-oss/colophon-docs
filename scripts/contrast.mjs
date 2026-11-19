// The contrast gate (D-210): measured on the RESOLVED values, per theme, in a real browser.
//
// Colours here are custom properties that point at other custom properties (src/styles/theme.css → the token copy),
// some of them tints: colour-mixes and alpha laid over a ground. So nothing is read from names. Each colour is
// resolved by the browser, painted onto a 1×1 canvas over the layers it really sits on, and read back as the sRGB
// a screen shows; WCAG's ratio is taken from those pixels. Two checks per theme:
//
// - `pairs`: every role pairing the theme makes (text 4.5:1, non-text 3:1), e.g. Starlight's ink on its page,
//   an aside's title on its tone's ground, inline code on the 12% tint Starlight lays over an aside's ground.
// - `sweep`: every visible text element on a page, against the stack of backgrounds behind it (gradient stops
//   included, the worst one counts); large text (24px, or 18.66px bold) needs 3:1.
//
//   node scripts/contrast.mjs <base> [path ...]     both checks, light and dark; exits 1 on any failure
//   (the role pairs are measured on the home page, a Starlight page; the sweep on every path)
import { fileURLToPath } from 'node:url';

/** [label, foreground, layers bottom→top, minimum]. Every name is a custom property on :root. */
export const PAIRS = (() => {
	const pairs = [];
	const text = (label, fg, layers) => pairs.push([label, fg, layers, 4.5]);
	const mark = (label, fg, layers) => pairs.push([label, fg, layers, 3]);
	const grounds = ['--sl-color-bg', '--sl-color-bg-nav', '--sl-color-bg-sidebar', '--sl-color-gray-6', '--sl-color-gray-7', '--card-bg', '--card-bg-open'];
	for (const ink of ['--sl-color-white', '--sl-color-gray-1', '--sl-color-gray-2', '--sl-color-text', '--sl-color-gray-3']) {
		for (const ground of grounds) text(`${ink} on ${ground}`, ink, [ground]);
	}
	for (const ground of ['--sl-color-bg', '--sl-color-bg-sidebar', '--card-bg']) {
		text(`link on ${ground}`, '--sl-color-text-accent', [ground]);
		mark(`focus ring on ${ground}`, '--ring', [ground]);
		mark(`control edge on ${ground}`, '--sl-color-gray-4', [ground]);
		mark(`accent mark on ${ground}`, '--sl-color-accent', [ground]);
	}
	for (const ground of ['--sl-color-bg', '--card']) mark(`field edge on ${ground}`, '--input', [ground]);
	text('current page in the sidebar', '--sl-color-accent-high', ['--sl-color-bg-sidebar', '--sl-color-accent-low']);
	text('primary button label', '--sl-color-text-invert', ['--sl-color-bg', '--sl-color-bg-accent']);
	text('primary button label, hovered', '--primary-foreground', ['--sl-color-bg', '--primary-hover']);
	text('secondary button label, hovered', '--accent-foreground', ['--sl-color-bg', '--accent']);
	text('inline code', '--secondary-foreground', ['--sl-color-bg', '--sl-color-bg-inline-code']);
	text('selected text', '--foreground', ['--sl-color-bg', '--brand-soft']);
	for (const hue of ['blue', 'purple', 'orange', 'red', 'green']) {
		const ground = ['--sl-color-bg', `--sl-color-${hue}-low`];
		text(`${hue} aside title`, `--sl-color-${hue}-high`, ground);
		text(`${hue} aside text`, '--sl-color-white', ground);
		text(`${hue} aside link`, `--sl-color-${hue}-high`, ground);
		mark(`${hue} aside focus ring`, '--ring', ground);
		// Starlight's own tint for code in an aside: the title colour at 12% over the tone's ground.
		text(`${hue} aside inline code`, '--secondary-foreground', [...ground, `color-mix(in srgb, var(--sl-color-${hue}-high) 12%, transparent)`]);
	}
	for (const variant of ['default', 'note', 'tip', 'caution', 'danger', 'success']) {
		text(`${variant} badge`, `--sl-badge-${variant}-text`, ['--sl-color-bg', `--sl-badge-${variant}-bg`]);
	}
	for (const ground of ['--card-bg', '--card-bg-hover', '--card-bg-open']) {
		text(`changelog muted on ${ground}`, '--card-muted', [ground]);
		text(`changelog live on ${ground}`, '--c-live', [ground]);
	}
	text('changelog chip', '--sl-color-gray-2', ['--card-bg', '--chip-bg']);
	text('changelog attention note', '--c-warn', ['--card-bg', '--card-attention']);
	return pairs;
})();

/** Runs in the page: both checks, on whatever theme the page is showing. */
function measure({ pairs, sweep }) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 1;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	const probe = document.createElement('i');
	probe.style.display = 'none';
	document.body.append(probe);
	/** A CSS colour (or `--name`) as the browser computes it here. */
	const resolve = (value) => {
		probe.style.color = '';
		probe.style.color = value.startsWith('--') ? `var(${value})` : value;
		return getComputedStyle(probe).color;
	};
	/** The sRGB pixel of `colors` painted in order (the first must be opaque). */
	const paint = (colors) => {
		ctx.clearRect(0, 0, 1, 1);
		for (const color of colors) {
			ctx.fillStyle = '#000';
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
		}
		return [...ctx.getImageData(0, 0, 1, 1).data];
	};
	const luminance = ([r, g, b]) => {
		const channel = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
		return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
	};
	const ratio = (a, b) => {
		const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
		return (x + 0.05) / (y + 0.05);
	};
	const failures = [];
	let measured = 0;
	// An undefined custom property makes `color: var(--x)` inherit, which would measure the wrong colour quietly.
	const root = getComputedStyle(document.documentElement);
	const undefinedIn = (names) => names.filter((name) => name.startsWith('--') && !root.getPropertyValue(name).trim());
	for (const [label, fg, layers, minimum] of pairs ?? []) {
		const missing = undefinedIn([fg, ...layers]);
		if (missing.length) {
			failures.push({ label, problem: `not defined here: ${missing.join(', ')}` });
			continue;
		}
		const ground = layers.map(resolve);
		if (ground.some((color) => !color)) {
			failures.push({ label, problem: 'a colour did not resolve' });
			continue;
		}
		const under = paint(ground);
		if (under[3] !== 255) {
			failures.push({ label, problem: 'the ground is not opaque' });
			continue;
		}
		const over = paint([...ground, resolve(fg)]);
		const value = ratio(over, under);
		measured += 1;
		if (value < minimum) failures.push({ label, ratio: Number(value.toFixed(2)), minimum, fg: resolve(fg), ground });
	}
	if (sweep) {
		const colorsIn = (image) => image.match(/(?:rgba?|oklch|oklab|lab|lch|hsla?|color)\([^()]*\)/g) ?? [];
		const page = getComputedStyle(document.documentElement).backgroundColor;
		const seen = new Set();
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		while (walker.nextNode()) {
			const node = walker.currentNode;
			if (!node.nodeValue.trim()) continue;
			const element = node.parentElement;
			if (!element || seen.has(element) || element.closest('script, style, noscript, [hidden], [aria-hidden="true"], svg')) continue;
			seen.add(element);
			const box = element.getBoundingClientRect();
			const style = getComputedStyle(element);
			if (!box.width || !box.height || style.visibility !== 'visible' || style.clip === 'rect(0px, 0px, 0px, 0px)') continue;
			if (style.clipPath && style.clipPath.startsWith('inset(50%')) continue;
			if (element.closest('[disabled], [aria-disabled="true"]')) continue;
			// The background stack, nearest last; a gradient counts as each of its stops.
			let opacity = 1;
			const stack = [];
			for (let at = element; at; at = at.parentElement) {
				const own = getComputedStyle(at);
				opacity *= Number(own.opacity);
				stack.unshift({ color: own.backgroundColor, stops: colorsIn(own.backgroundImage) });
			}
			if (opacity < 0.1) continue;
			const base = paint(['#fff', page]);
			const grounds = [[`rgb(${base[0]}, ${base[1]}, ${base[2]})`]];
			for (const layer of stack) {
				for (const ground of grounds) ground.push(layer.color);
				if (layer.stops.length) {
					const next = [];
					for (const ground of grounds) for (const stop of layer.stops) next.push([...ground, stop]);
					grounds.splice(0, grounds.length, ...next.slice(0, 16));
				}
			}
			const size = parseFloat(style.fontSize);
			const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
			const minimum = large ? 3 : 4.5;
			let worst = Infinity;
			for (const ground of grounds) worst = Math.min(worst, ratio(paint([...ground, style.color]), paint(ground)));
			measured += 1;
			if (worst < minimum) {
				failures.push({ label: `"${node.nodeValue.trim().slice(0, 40)}" <${element.tagName.toLowerCase()} class="${element.className}">`, ratio: Number(worst.toFixed(2)), minimum, fg: style.color });
			}
		}
	}
	probe.remove();
	return { measured, failures };
}

/** Opens `url` in `theme` and measures it. */
export async function contrastOn(browser, url, theme, { pairs = null, sweep = true, width = 1440 } = {}) {
	const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
	await context.addInitScript((t) => {
		try {
			localStorage.setItem('starlight-theme', t);
		} catch {}
	}, theme);
	const page = await context.newPage();
	try {
		await page.goto(url, { waitUntil: 'networkidle' });
		const shown = await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.classList.contains('dark')]);
		if (shown[0] !== theme || shown[1] !== (theme === 'dark')) {
			return { measured: 0, failures: [{ label: 'theme', problem: `asked for ${theme}, the page shows data-theme=${shown[0]} with .dark ${shown[1]}` }] };
		}
		return await page.evaluate(measure, { pairs, sweep });
	} finally {
		await context.close();
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { chromium } = await import('playwright');
	const [base, ...rest] = process.argv.slice(2);
	if (!base) {
		console.error('usage: node scripts/contrast.mjs <base> [path ...]');
		process.exit(2);
	}
	const paths = rest.length ? rest : ['/'];
	const browser = await chromium.launch();
	let failed = 0;
	try {
		for (const theme of ['light', 'dark']) {
			const roles = await contrastOn(browser, new URL('/', base).href, theme, { pairs: PAIRS, sweep: false });
			console.log(`contrast ${theme}: ${roles.measured} role pairs, ${roles.failures.length} below their bar`);
			for (const failure of roles.failures) console.log('  ', JSON.stringify(failure));
			failed += roles.failures.length;
			for (const path of paths) {
				const swept = await contrastOn(browser, new URL(path, base).href, theme);
				console.log(`contrast ${theme} ${path}: ${swept.measured} text elements, ${swept.failures.length} below their bar`);
				for (const failure of swept.failures.slice(0, 20)) console.log('  ', JSON.stringify(failure));
				failed += swept.failures.length;
			}
		}
	} finally {
		await browser.close();
	}
	process.exit(failed ? 1 : 0);
}
