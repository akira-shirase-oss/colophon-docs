# The quick start's Studio steps (parts 1 and 2, and making the API token in part 3), done
# through the same API the Studio calls, so CI reaches the state the reader reaches by clicking:
#
#   - the first account, "Akira Shirase", made administrator with the printed setup code;
#   - the project "Field notes" (field-notes);
#   - the content type Recipes: Dish (text, names each entry), Minutes (whole number), Method
#     (rich text), saved twice as the Studio does (made with Dish, then the other two added);
#   - the entry "Lemon tart", made with its Dish and then saved with the rest, as autosave does;
#   - published in one step (request, send for review, approve, publish), so release 1;
#   - the API token "Recipe site": full access, 90 days.
#
# The snippet runner sources this file inside the reader's shell, in the quick start's folder
# (so `docker compose logs` works), with BASE set to the server's address. It exports PROJECT and
# COLOPHON_TOKEN, exactly what the reader exports by hand.

jar=$(mktemp)
csrf() { awk '$6 == "colophon_csrf" { print $7 }' "$jar"; }
person() { # METHOD PATH [JSON] [extra curl args...]: a cookie-authenticated call, as the Studio makes it
	local method=$1 path=$2 body=${3:-}
	shift 3 || shift $#
	curl -fsS -b "$jar" -c "$jar" -X "$method" "$BASE$path" \
		-H "Origin: $BASE" -H "X-CSRF-Token: $(csrf)" -H 'Content-Type: application/json' \
		${body:+--data "$body"} "$@"
}
key() { printf 'studio-%s-%s' "$1" "$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"; }

# Part 1: the first account, then the setup code from the server's log.
curl -fsS -c "$jar" -X POST "$BASE/auth/signup" -H 'Content-Type: application/json' \
	--data '{"display_name": "Akira Shirase", "email": "akira@example.com", "password": "quick-start-password"}' >/dev/null
setup_code=$(docker compose logs colophon 2>/dev/null | sed -n 's/.*Setup code: \([0-9A-Z-]*\).*/\1/p' | tail -n 1)
person POST /api/v1/setup "{\"code\": \"$setup_code\"}" >/dev/null

# Part 2: the project, the content type, the entry, published.
PROJECT=$(person POST /api/v1/projects '{"name": "Field notes", "slug": "field-notes"}' | jq -r .data.id)
env="/api/v1/projects/$PROJECT/environments/production"
person POST "$env/content-types" \
	'{"slug": "recipes", "definition": {"name": "Recipes", "title_field": "dish", "fields": [{"id": "dish", "label": "Dish", "type": "text", "required": true, "max_chars": 200, "multiline": false}]}}' \
	-H "Idempotency-Key: $(key type)" >/dev/null
person PUT "$env/content-types/recipes" \
	'{"name": "Recipes", "title_field": "dish", "fields": [{"id": "dish", "label": "Dish", "type": "text", "required": true, "max_chars": 200, "multiline": false}, {"id": "minutes", "label": "Minutes", "type": "number", "required": false, "integer": true}, {"id": "method", "label": "Method", "type": "rich_text", "required": false}]}' \
	-H 'If-Match: "v1"' -H "Idempotency-Key: $(key type)" >/dev/null
entry=$(person POST "$env/collections/recipes/entries" '{"dish": "Lemon tart"}' -H "Idempotency-Key: $(key entry)" | jq -r .data.id)
etag=$(person GET "$env/collections/recipes/entries/$entry" '' -D - -o /dev/null | sed -n 's/^etag: //Ip' | tr -d '\r')
person PUT "$env/collections/recipes/entries/$entry" \
	'{"dish": "Lemon tart", "minutes": 45, "method": {"schema": "colophon/rich-text", "version": 1, "doc": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Blind-bake the pastry, then fill it with lemon curd and bake until just set."}]}]}}}' \
	-H "If-Match: $etag" -H "Idempotency-Key: $(key save)" >/dev/null
request=$(person POST "$env/changesets" "{\"title\": \"Lemon tart\", \"entries\": [\"$entry\"]}" -H "Idempotency-Key: $(key request)")
id=$(jq -r .data.id <<<"$request")
hash=$(jq -r .data.hash <<<"$request")
person POST "$env/changesets/$id/submit" '' -H "If-Match: \"$hash\"" >/dev/null
person POST "$env/changesets/$id/reviews" '{"decision": "approve", "comment": "Approved and published in one step."}' -H "If-Match: \"$hash\"" >/dev/null
person POST "$env/changesets/$id/publish" '{"base_generation": 0}' -H "If-Match: \"$hash\"" -H "Idempotency-Key: $(key publish)" >/dev/null

# Part 3: the API token, as Settings → API tokens → New token makes it.
COLOPHON_TOKEN=$(person POST "/api/v1/projects/$PROJECT/tokens" \
	'{"name": "Recipe site", "description": "Reads recipes and saves drafts from the import script.", "kind": "full-access", "expires_in_days": 90}' | jq -r .data.secret)
export PROJECT COLOPHON_TOKEN
rm -f "$jar"
unset -f csrf person key
unset jar setup_code env entry etag request id hash
