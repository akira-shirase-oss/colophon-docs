# The owner presses Unpublish on the entry in the Studio: one publish request that takes ENTRY down,
# sent for review, approved and published in one step, as release 3.
__env="$BASE/api/v1/projects/$PROJECT/environments/production"
__as_owner() { curl -fsS -H "Authorization: Bearer $PERSONAL_TOKEN" -H 'Content-Type: application/json' "$@"; }
__made=$(__as_owner -X POST "$__env/changesets" -H "Idempotency-Key: take-down-$ENTRY" \
	--data "{\"title\": \"Ginger biscuits\", \"unpublish\": [\"$ENTRY\"]}")
__id=$(jq -r .data.id <<<"$__made")
__hash=$(jq -r .data.hash <<<"$__made")
__as_owner -X POST "$__env/changesets/$__id/submit" -H "If-Match: \"$__hash\"" >/dev/null
__as_owner -X POST "$__env/changesets/$__id/reviews" -H "If-Match: \"$__hash\"" \
	--data '{"decision": "approve", "comment": "Approved and published in one step."}' >/dev/null
__as_owner -X POST "$__env/changesets/$__id/publish" -H "If-Match: \"$__hash\"" -H "Idempotency-Key: take-down-publish-$ENTRY" \
	--data '{"base_generation": 2}' >/dev/null
unset -f __as_owner
unset __env __made __id __hash
