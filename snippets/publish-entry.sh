# What the reader does in the Studio while a stream is open: Akira Shirase writes a new recipe and
# publishes it in one step (request, send for review, approve, publish), through the API the Studio
# calls. `{/* snippet SUITE: snippets/publish-entry.sh "Dish name" */}`; uses PROJECT.
__jar=$(mktemp)
curl -fsS -c "$__jar" -X POST "$BASE/auth/signin" -H 'Content-Type: application/json' \
	--data '{"email": "akira@example.com", "password": "quick-start-password"}' >/dev/null
__person() {
	local method=$1 path=$2 body=${3:-}
	shift 3 || shift $#
	curl -fsS -b "$__jar" -X "$method" "$BASE$path" -H "Origin: $BASE" \
		-H "X-CSRF-Token: $(awk '$6 == "colophon_csrf" { print $7 }' "$__jar")" -H 'Content-Type: application/json' \
		${body:+--data "$body"} "$@"
}
__key() { printf 'docs-%s' "$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"; }
__env="/api/v1/projects/$PROJECT/environments/production"
__entry=$(__person POST "$__env/collections/recipes/entries" "$(jq -n --arg dish "$1" '{dish: $dish, minutes: 40}')" -H "Idempotency-Key: $(__key)" | jq -r .data.id)
__request=$(__person POST "$__env/changesets" "$(jq -n --arg t "$1" --arg e "$__entry" '{title: $t, entries: [$e]}')" -H "Idempotency-Key: $(__key)")
__id=$(jq -r .data.id <<<"$__request")
__hash=$(jq -r .data.hash <<<"$__request")
__base=$(__person GET "$__env/releases?limit=1" | jq -r '.data[0].generation // 0')
__person POST "$__env/changesets/$__id/submit" '' -H "If-Match: \"$__hash\"" >/dev/null
__person POST "$__env/changesets/$__id/reviews" '{"decision": "approve"}' -H "If-Match: \"$__hash\"" >/dev/null
__person POST "$__env/changesets/$__id/publish" "{\"base_generation\": $__base}" -H "If-Match: \"$__hash\"" -H "Idempotency-Key: $(__key)" >/dev/null
rm -f "$__jar"
unset -f __person __key
unset __jar __env __entry __request __id __hash __base
