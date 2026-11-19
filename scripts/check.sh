#!/usr/bin/env bash
# The gate before every push: `scripts/check.sh && git push`. What CI's build job checks, minus the
# parts that need Docker or the network (the examples against a real Colophon, external links, the
# OpenAPI copy against colophon-cms main), which CI runs on every push.
set -euo pipefail
cd "$(dirname "$0")/.."
node --test scripts/*.test.mjs                 # the snippet runner's and the build fixes' own tests
node scripts/axe-scan.check.mjs                # the accessibility scan fails a known-bad page
node scripts/contrast.check.mjs                # the contrast gate fails an inverted map, a blended tint, a gradient stop
node scripts/snippets.mjs --coverage >/dev/null # every code block runs, is checked, or says why not
npm run build                                  # internal links, CSP hashes, the output checks
# Nothing private in what is committed: home paths and this machine's account name.
if git grep -nIE '/Users/|/home/[a-z]' -- ':!scripts/check.sh' ':!package-lock.json' >/dev/null; then
	echo 'check: a home path is in a tracked file:' >&2
	git grep -nIE '/Users/|/home/[a-z]' -- ':!scripts/check.sh' ':!package-lock.json' >&2
	exit 1
fi
echo 'check: passed'
