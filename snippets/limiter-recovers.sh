# After the rate-limits page's burst: wait until this client address is answered normally again.
#   {/* snippet ops: snippets/limiter-recovers.sh */}
# The burst sends 900 requests from the runner's own address to show a 429, which empties that
# address's bucket (300 a second, a burst of 600). Every page after it runs from the same address, so
# without this the next page's first request races the refill and is refused too: website-connections'
# first create was answered `429 rate_limited, retry-after: 10` in CI on 2026-11-20. The page is right;
# the suite must wait, as any client honouring Retry-After would. Fails if the limiter never recovers
# within 30 seconds, which would be a bug of its own.
__probe="$BASE/api/v1/projects/$PROJECT"
for __try in $(seq 30); do
	__status=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $COLOPHON_TOKEN" "$__probe")
	[[ $__status == 429 ]] || break
	sleep 1
done
[[ $__status != 429 ]] || { echo "limiter-recovers: $__probe still answers 429 after 30 seconds" >&2; return 1; }
[[ $__status == 200 ]] || { echo "limiter-recovers: $__probe answered $__status, not 200" >&2; return 1; }
