# The page's "start a session as in steps 1 and 2": `initialize` without a session id, then
# `notifications/initialized` with the id it gave. Exports MCP_SESSION.
__mcp="$BASE/api/v1/projects/$PROJECT/environments/production/mcp"
MCP_SESSION=$(curl -fsS -D - -o /dev/null -X POST "$__mcp" -H "Authorization: Bearer $COLOPHON_TOKEN" \
	-H 'Content-Type: application/json' -H 'MCP-Protocol-Version: 2025-11-25' \
	--data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"docs-example","version":"1.0.0"}}}' |
	sed -n 's/^mcp-session-id: //Ip' | tr -d '\r')
[[ -n $MCP_SESSION ]] || { echo "mcp-session: initialize gave no session id" >&2; return 1; }
curl -fsS -o /dev/null -X POST "$__mcp" -H "Authorization: Bearer $COLOPHON_TOKEN" \
	-H 'Content-Type: application/json' -H 'MCP-Protocol-Version: 2025-11-25' -H "Mcp-Session-Id: $MCP_SESSION" \
	--data '{"jsonrpc":"2.0","method":"notifications/initialized"}'
export MCP_SESSION
unset __mcp
