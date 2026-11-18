# What the reader copies by hand from the answer just shown, taken from it instead:
#   {/* snippet SUITE: snippets/from-last.sh NAME=.jq.path NAME=header:etag */}
# exports each NAME from the last command's output ($SNIPPET_LAST): a jq path into its JSON body,
# a response header's value, `uuid:N`, the Nth id (from 1) printed anywhere in it, or `match:REGEX`,
# the first text matching an extended regular expression (the CLI's text answers).
__answer=$(sed -n '/^[{[]/,$p' "$SNIPPET_LAST")
for __pair in "$@"; do
	__name=${__pair%%=*}
	__what=${__pair#*=}
	case $__what in
	uuid:*) __value=$(grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$SNIPPET_LAST" | sed -n "${__what#uuid:}p") ;;
	match:*) __value=$(grep -oE "${__what#match:}" "$SNIPPET_LAST" | head -n 1) ;;
	header:*) __value=$(sed -n "s/^${__what#header:}: //Ip" "$SNIPPET_LAST" | head -n 1 | tr -d '\r') ;;
	*) __value=$(jq -r "$__what" <<<"$__answer") ;;
	esac
	[[ -n $__value && $__value != null ]] || { echo "from-last: no $__what in the last answer" >&2; return 1; }
	export "$__name=$__value"
done
unset __answer __pair __name __what __value
