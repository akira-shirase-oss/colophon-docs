# `colophon login` as the reader does it, with the browser step made through the API: the CLI asks
# for a code and waits; Akira Shirase, signed in to the Studio, allows it on the device page (the
# same call the page's Allow button makes); the CLI then saves its sign-in. Uses the page's
# `colophon` alias. Exports nothing: the CLI keeps the sign-in in its own config.
__log=$(mktemp)
colophon login > "$__log" 2>&1 &
__pid=$!
__code=
for __try in $(seq 50); do
	__code=$(sed -n 's/.*code=\([A-Z0-9-]*\).*/\1/p' "$__log" | head -n 1)
	[[ -n $__code ]] && break
	sleep 0.2
done
[[ -n $__code ]] || { echo "cli-login: colophon login printed no code" >&2; cat "$__log" >&2; return 1; }
__jar=$(mktemp)
curl -fsS -c "$__jar" -X POST "$BASE/auth/signin" -H 'Content-Type: application/json' \
	--data '{"email": "akira@example.com", "password": "quick-start-password"}' >/dev/null
curl -fsS -b "$__jar" -X POST "$BASE/auth/device/approve" -H "Origin: $BASE" \
	-H "X-CSRF-Token: $(awk '$6 == "colophon_csrf" { print $7 }' "$__jar")" -H 'Content-Type: application/json' \
	--data "{\"user_code\": \"$__code\"}" >/dev/null
wait "$__pid" || { echo "cli-login: colophon login failed" >&2; cat "$__log" >&2; return 1; }
grep -q '^Signed in to ' "$__log" || { cat "$__log" >&2; return 1; }
rm -f "$__log" "$__jar"
unset __log __pid __code __try __jar
