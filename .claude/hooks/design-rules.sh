#!/bin/sh
# Claude Code PostToolUse hook: after an edit to a page's code or styles,
# run the tests that guard the site's visual rules (contrast, type sizes,
# no italics, no hairlines). On a failure, exit 2 so Claude sees the
# failing lines and fixes them before going on.
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  */src/*.tsx|*/src/*.ts|*/src/*.css) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
out=$(npx vitest run tests/contrast.test.ts tests/design-rules.test.ts 2>&1) && exit 0
echo "$out" | grep -E '^\s*(FAIL|\+ |AssertionError|×)' | head -40 >&2
echo "The site's visual rules failed after editing $file (see .claude/skills/conventions.md section 2)." >&2
exit 2
