# Akira Shirase opens the agent's draft ENTRY in the Studio and saves it (55 minutes, not 50), after
# the agent read it: the save the agent's next update_draft hasn't seen.
__entry="$BASE/api/v1/projects/$PROJECT/environments/production/collections/recipes/entries/$ENTRY"
__etag=$(curl -fsS -D - -o /dev/null "$__entry" -H "Authorization: Bearer $PERSONAL_TOKEN" | sed -n 's/^etag: //Ip' | tr -d '\r')
curl -fsS -o /dev/null -X PUT "$__entry" -H "Authorization: Bearer $PERSONAL_TOKEN" -H 'Content-Type: application/json' \
	-H "If-Match: $__etag" -H "Idempotency-Key: mcp-someone-saves-$ENTRY" --data '{"dish": "Treacle tart", "minutes": 55}'
unset __entry __etag
