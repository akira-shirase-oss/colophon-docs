# To the quick start's folder (colophon-cms/deploy/quickstart), wherever the suite before left the
# shell: the runner starts either in it (--cwd) or in the folder the install step clones into.
for __dir in "$SNIPPET_HOME" "$SNIPPET_HOME/colophon-cms/deploy/quickstart"; do
	[[ -f $__dir/compose.yaml ]] && { cd "$__dir"; break; }
done
[[ -f compose.yaml ]] || { echo "cd-quickstart: no compose.yaml under $SNIPPET_HOME" >&2; return 1; }
unset __dir
