# A token an agent used to have: made full access ("Old agent") and then revoked in the Studio.
# Exports REVOKED_TOKEN.
__tokens="$BASE/api/v1/projects/$PROJECT/tokens"
__made=$(curl -fsS -X POST "$__tokens" -H "Authorization: Bearer $PERSONAL_TOKEN" -H 'Content-Type: application/json' \
	--data '{"name": "Old agent", "kind": "full-access", "expires_in_days": 1}')
curl -fsS -o /dev/null -X DELETE "$__tokens/$(jq -r .data.id <<<"$__made")" -H "Authorization: Bearer $PERSONAL_TOKEN"
REVOKED_TOKEN=$(jq -r .data.secret <<<"$__made")
export REVOKED_TOKEN
unset __tokens __made
