# `open`: the token opens eight sessions, its cap, as a busy agent would (the ids are kept in
# __MCP_BUSY). `close`: it ends them with DELETE, as the page advises.
__mcp="$BASE/api/v1/projects/$PROJECT/environments/production/mcp"
case $1 in
open)
	__MCP_BUSY=()
	for __n in 1 2 3 4 5 6 7 8; do
		__MCP_BUSY+=("$(curl -fsS -D - -o /dev/null -X POST "$__mcp" -H "Authorization: Bearer $COLOPHON_TOKEN" \
			-H 'Content-Type: application/json' -H 'MCP-Protocol-Version: 2025-11-25' \
			--data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"busy-agent","version":"1.0.0"}}}' |
			sed -n 's/^mcp-session-id: //Ip' | tr -d '\r')")
	done
	;;
close)
	for __id in "${__MCP_BUSY[@]}"; do
		curl -fsS -o /dev/null -X DELETE "$__mcp" -H "Authorization: Bearer $COLOPHON_TOKEN" \
			-H 'MCP-Protocol-Version: 2025-11-25' -H "Mcp-Session-Id: $__id"
	done
	unset __MCP_BUSY __id
	;;
esac
unset __mcp __n
