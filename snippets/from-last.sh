# What the reader copies by hand from the answer just shown, taken from it instead:
#   {/* snippet SUITE: snippets/from-last.sh NAME=.jq.path NAME=header:etag */}
# exports each NAME from the last command's output ($SNIPPET_LAST): a jq path into its JSON body,
# or a response header's value.
__answer=$(sed -n '/^[{[]/,$p' "$SNIPPET_LAST")
for __pair in "$@"; do
	__name=${__pair%%=*}
	__what=${__pair#*=}
	case $__what in
	header:*) __value=$(sed -n "s/^${__what#header:}: //Ip" "$SNIPPET_LAST" | head -n 1 | tr -d '\r') ;;
	*) __value=$(jq -r "$__what" <<<"$__answer") ;;
	esac
	[[ -n $__value && $__value != null ]] || { echo "from-last: no $__what in the last answer" >&2; return 1; }
	export "$__name=$__value"
done
unset __answer __pair __name __what __value
