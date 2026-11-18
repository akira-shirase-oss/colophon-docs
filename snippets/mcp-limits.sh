# The owner sets the limits of the quick start's token ("Recipe site", COLOPHON_TOKEN) with the API,
# as the Authentication page shows: `mcp-limits.sh requests_per_minute=2`, `documents_per_day=1`,
# or `none` to remove them all.
__tokens="$BASE/api/v1/projects/$PROJECT/tokens"
__id=$(curl -fsS "$__tokens" -H "Authorization: Bearer $PERSONAL_TOKEN" |
	jq -r '[.data[] | select(.name == "Recipe site" and .state == "active")][0].id')
if [[ $1 == none ]]; then __limits=null; else __limits="{\"${1%%=*}\": ${1#*=}}"; fi
curl -fsS -o /dev/null -X PATCH "$__tokens/$__id" -H "Authorization: Bearer $PERSONAL_TOKEN" \
	-H 'Content-Type: application/json' --data "{\"limits\": $__limits}"
unset __tokens __id __limits
