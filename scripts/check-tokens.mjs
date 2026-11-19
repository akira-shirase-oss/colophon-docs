// The docs' copy of Colophon's design tokens (D-210) is the source, byte for byte, at a PINNED ref: a token change
// in colophon-cms never breaks this build by surprise, and moving COLOPHON_REF is the deliberate step that adopts
// it (colophon-cms design/README.md). The Geist Pixel file is checked against the sha256 the source records.
//
//   node scripts/check-tokens.mjs                    against colophon-cms at COLOPHON_REF (needs the network)
//   node scripts/check-tokens.mjs --source FILE      against a local copy of design/tokens.css
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** The colophon-cms commit the tokens are copied from; becomes the release tag v0.1.0-alpha.1 once it is cut. */
export const COLOPHON_REF = '15b283db0391cff47fab8ac2d9fbf3d0e46b582a';
const COPY = 'src/styles/tokens.css';
const FONT = 'public/fonts/geist-pixel-latin.woff2';

const args = process.argv.slice(2);
const local = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
let source;
if (local) {
	source = readFileSync(local);
} else {
	const url = `https://raw.githubusercontent.com/akira-shirase-oss/colophon-cms/${COLOPHON_REF}/design/tokens.css`;
	const response = await fetch(url);
	if (!response.ok) {
		console.error(`check-tokens: ${url} answered ${response.status}`);
		process.exit(1);
	}
	source = Buffer.from(await response.arrayBuffer());
}
const copy = readFileSync(COPY);
if (!copy.equals(source)) {
	console.error(`check-tokens: ${COPY} differs from colophon-cms ${local ?? COLOPHON_REF} design/tokens.css: copy it again`);
	process.exit(1);
}
// The source's header records the font: `geist-pixel-latin.woff2  <bytes> bytes  sha256 <hex>`.
const recorded = source.toString('utf8').match(/geist-pixel-latin\.woff2\s+(\d+) bytes\s+sha256 ([0-9a-f]{64})/);
if (!recorded) {
	console.error('check-tokens: the source no longer records the Geist Pixel file');
	process.exit(1);
}
const font = readFileSync(FONT);
const sha = createHash('sha256').update(font).digest('hex');
if (sha !== recorded[2] || font.length !== Number(recorded[1])) {
	console.error(`check-tokens: ${FONT} is ${font.length} bytes, sha256 ${sha}; the source records ${recorded[1]} bytes, ${recorded[2]}`);
	process.exit(1);
}
console.log(`check-tokens: ${COPY} is colophon-cms ${local ? local : COLOPHON_REF.slice(0, 8)} design/tokens.css; ${FONT} matches its recorded sha256`);
