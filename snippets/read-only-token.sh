# A Read only token, as Settings → API tokens → New token makes it ("Site reader", 30 days).
# Exports READ_ONLY_TOKEN.
READ_ONLY_TOKEN=$(curl -fsS -X POST "$BASE/api/v1/projects/$PROJECT/tokens" \
	-H "Authorization: Bearer $PERSONAL_TOKEN" -H 'Content-Type: application/json' \
	--data '{"name": "Site reader", "kind": "read-only", "expires_in_days": 30}' | jq -r .data.secret)
export READ_ONLY_TOKEN
