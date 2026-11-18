# Colophon Docs

The documentation for [Colophon](https://github.com/akira-shirase-oss/colophon-cms), the open-source headless
CMS where every publish is a numbered release with a receipt: the quick start, the Studio guide, the delivery
and management APIs, API tokens, the SDK, the CLI, self-hosting, the API reference and the changelog.

**Read it at <https://docs.colophon.404human.dev>.**

Built with [Astro Starlight](https://starlight.astro.build): static pages, Pagefind search, and almost no
JavaScript. The API reference is [Scalar](https://github.com/scalar/scalar), served from this site.

## How it stays true

Documentation that drifts from the code is worse than none, so CI checks the docs against Colophon itself
(`.github/workflows/ci.yml`), on every push and every night:

- **Examples run.** Code blocks marked `run=<suite>` are executed in order, in one shell, against a Colophon
  built from colophon-cms `main` with the quick start's own commands; the block marked `output=<suite>`
  after each must match what the server printed, once ids, times, secrets and hashes are normalised
  (`scripts/snippets.mjs`). Where the reader clicks in the Studio, `{/* snippet suite: script */}` runs the
  same steps through the API (`snippets/`).
- **The API reference is current.** `src/data/openapi.json` is a byte-for-byte copy of colophon-cms
  `docs/api/openapi.json`; CI fails when they differ.
- **Links resolve.** Internal links are checked while building; external ones by lychee.
- **The output is complete and clean.** Every page has its Markdown copy, search and `llms.txt` are built,
  and no machine path or private name is in the output (`scripts/check-dist.mjs`).

## Working on it

Node.js 22.17 or newer.

```sh
npm ci
npm run dev                    # http://localhost:4321
npm run build                  # the site in dist/, checked
npm run sync:openapi           # copy the OpenAPI document from colophon-cms main
npm test                       # the snippet runner's own tests
scripts/check.sh               # the gate before every push: scripts/check.sh && git push
```

Running the examples needs Docker, `curl` and `jq`. With nothing on port 8080:

```sh
node scripts/snippets.mjs                  # build Colophon from main, start it, run every example
node scripts/snippets.mjs --list           # what would run, in order
```

Against a Colophon you already started from the quick start's compose file (fresh, nobody signed up):

```sh
COMPOSE_PROJECT_NAME=… node scripts/snippets.mjs --base http://localhost:58140 --skip install \
  --cwd path/to/colophon-cms/deploy/quickstart          # add --update to rewrite the pages' outputs
node scripts/capture-screens.mjs --base http://localhost:58140 --compose-dir path/to/deploy/quickstart
```

## Writing

- Say what Colophon does on `main` today, in the Studio's own words (*publish request*, *release*,
  *receipt*, *website connection*). Something not built yet is left out, or marked **Planned** when the
  roadmap says so.
- No commit hashes, file paths of the product repository, internal decision numbers or CI ids in public text.
- Changelog entries live in `src/content/changelog/`, one file per change, named `YYYY-MM-DD-short-name.md`
  (the name is the entry's permanent anchor). The schema is in `src/content.config.ts`.

## Deploying

Cloudflare Pages, project `colophon-docs`:

```sh
npm run build
npx -y wrangler@4.148.0 pages deploy dist --project-name colophon-docs --branch main
npm run check:live -- https://docs.colophon.404human.dev   # search, the reference, no sideways scroll
```

## Licence

MIT, like Colophon. The fonts in `public/fonts` (DM Sans, Geist) are under the SIL Open Font License 1.1.
