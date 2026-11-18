# Waits until the server's /readyz says STATUS (default ready), as a reader would look again after a
# moment: `{/* snippet SUITE: snippets/wait-ready.sh degraded */}`. Gives up after 60 seconds.
__want=${1:-ready}
for __try in $(seq 120); do
	[[ $(curl -s "$BASE/readyz" | jq -r .status 2>/dev/null) == "$__want" ]] && break
	sleep 0.5
done
[[ $(curl -s "$BASE/readyz" | jq -r .status 2>/dev/null) == "$__want" ]] || { echo "wait-ready: /readyz never said $__want" >&2; return 1; }
unset __want __try
