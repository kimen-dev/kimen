#!/usr/bin/env bash
# Gate: scenario-to-test traceability (constitution Art. II).
#
# Every scenario ID S<n> in EVERY specs/<feature>/ feature file must be
# referenced by at least one test that is traceable TO THAT FEATURE.
#
# Traceability convention (Kimen): a test file declares which feature(s) it
# traces with a file-level marker containing the feature directory basename:
#
#     // @spec:007-ki-button
#
# Bare scenario IDs (S1, S2, ...) inside a marked file then count toward that
# feature ONLY. S-IDs are feature-scoped: S1 of feature A never satisfies S1
# of feature B. A file may carry several @spec: markers when it covers
# scenarios from more than one feature. The marker is matched literally
# (colon, no space), so keep it exactly as `@spec:<feature-dir>`.
#
# Usage: check-traceability.sh [feature-dir] [test-root-override]
#   - no args: iterate over ALL specs/*/ feature dirs (the CI-gate mode used
#     by gates-suite.sh).
#   - by default, tests are discovered only below the declared roots:
#     packages, scripts, .github, sandbox and tools. The optional second
#     argument narrows discovery to one root for fixture/backward compatibility.
#   - SKIP (exit 0, loud) when specs/ is absent or contains no feature files
#     yet (pre-Fase-2 state). An explicit feature-dir arg never skips.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. scripts/gates/lib.sh

ONLY="${1:-}"
TEST_ROOT_OVERRIDE="${2:-}"
if [ -n "$TEST_ROOT_OVERRIDE" ]; then
  TEST_ROOTS=("$TEST_ROOT_OVERRIDE")
else
  TEST_ROOTS=(packages scripts .github sandbox tools)
fi

# Strip comments so an S-ID that appears only in prose never counts as
# evidence. This is a single left-to-right scan over four states — code,
# string literal, regular-expression literal, block comment — because they
# cannot be recognized independently; whichever state is entered first wins.
#
# Each state is here because leaving it out produced a real defect:
#   - strings: a scenario ID lives inside a string literal (a test title), and
#     string literals routinely contain comment openers ('/assets/fonts/*' is a
#     Cloudflare _headers glob, 'https://kimen.dev/' is a URL, '#main' is a
#     selector). Scanning for comment openers without tracking strings made the
#     first such literal swallow every following line of the file, and this
#     gate then reported PASS over evidence it had never read — found
#     2026-08-11, when the whole of scripts/tests/site-publication.test.mjs was
#     invisible to it.
#   - comments: blanking strings first fails the mirror image, because comments
#     routinely contain apostrophes ("a radio's control") and the phantom
#     string swallows the comment's own terminator.
#   - regex literals: `const re = /don't/u;  // S3 is not evidence` has the
#     apostrophe in neither a string nor a comment. Without this state the
#     apostrophe opens a phantom string, the trailing `//` is never seen, and
#     the comment counts as evidence — which is the exact gaming vector the
#     "comments do not count" rule exists to block (see the note further down).
#
# WHAT ACTUALLY HOLDS, AND WHAT DOES NOT. Block-comment state carries across
# lines, by necessity. String and regex state do not: a line that ends in
# either one is treated as unparseable, its scan result is discarded, and the
# raw line is re-stripped conservatively (block-comment pairs, then everything
# from the first // or #) exactly as the pre-2026-08-11 implementation did.
# A speculative regex that runs into an unescaped `//` is treated the same way,
# since a regex literal cannot contain one: that combination means the opening
# `/` was really division or a path separator, and the `//` is a comment.
#
# This is a heuristic lexer, not a parser, and it is applied unchanged to
# *.test.sh as well as to JavaScript and TypeScript — shell files are scanned
# with a JavaScript-shaped lexer, where `/` is a path separator rather than
# division or a regex delimiter. Two known shapes defeat it, in OPPOSITE
# directions. Neither is hypothetical; both were measured against this
# repository and neither occurs in it today.
#
#   1. A `/` after `)` or `]` that really opens a regex is read as division,
#      because telling those apart needs a real JavaScript parser. If that
#      regex's contents hold an odd number of quote characters, the leftover
#      quote opens a phantom string. Should a matching quote then appear
#      inside a trailing comment (`// doesn't count`), the phantom string
#      closes there, the comment marker is never seen, and THE COMMENT IS
#      EMITTED AS EVIDENCE. This direction invents evidence: the gate can
#      report PASS on an S-ID that only ever appeared in prose. It is the
#      failure the "comments do not count" rule exists to prevent, and it
#      remains open.
#   2. A `/*` inside a multi-line template literal opens block state, which
#      then truncates every line up to the next `*/`. This direction loses
#      evidence: the gate reports FAIL for an S-ID that a test really covers.
#      Noisy, not dangerous.
#
# There is no single safe direction here, and any wording that implies one is
# wrong. A change to this function has to be argued and measured against both
# rules at once: coverage (every S-ID has a test) wants more lines visible,
# evidence integrity (comments never count) wants fewer.
append_executable_lines() {
  local source_file="$1"
  local destination="$2"
  awk '
    # A `/` opens a regex literal only where an expression may begin: at the
    # start of a line, after an operator or opening bracket, or after a keyword
    # that cannot be followed by division. After a value (identifier, literal,
    # `)`, `]`) it is division. The keyword list exists for `return /…/`, which
    # is ordinary test-file code; without it the `/` reads as division and an
    # apostrophe inside the literal opens a phantom string — see failure shape
    # 1 in the header, which this narrows but does not close.
    function opens_regex(previous, code_so_far) {
      if (previous == "" || index("([{,;:=!&|?+-*%~^<>", previous) > 0) { return 1 }
      return match(code_so_far, /(^|[^A-Za-z0-9_$])(return|typeof|case|in|of|new|delete|void|do|else|yield|await|throw)[[:space:]]*$/) > 0
    }
    # The pre-2026-08-11 stripper, kept verbatim as the fallback for a line the
    # scanner could not parse. Conservative by construction: it cuts at the
    # FIRST // or #, even one inside a string.
    function conservative_text(source,   text, prefix, suffix) {
      text = source
      while (match(text, /\/\*/)) {
        prefix = substr(text, 1, RSTART - 1)
        suffix = substr(text, RSTART + RLENGTH)
        if (match(suffix, /\*\//)) {
          text = prefix substr(suffix, RSTART + RLENGTH)
        } else {
          text = prefix
          in_block = 1
          break
        }
      }
      sub(/[[:space:]]*\/\/.*/, "", text)
      sub(/[[:space:]]*#.*/, "", text)
      return text
    }
    function executable_text(source,   out, i, character, pair, length_of_source, quote, in_regex, in_class, previous) {
      out = ""
      quote = ""
      in_regex = 0
      in_class = 0
      previous = ""
      length_of_source = length(source)
      i = 1
      while (i <= length_of_source) {
        character = substr(source, i, 1)
        pair = substr(source, i, 2)
        if (in_block) {
          if (pair == "*/") { in_block = 0; i += 2 } else { i += 1 }
          continue
        }
        if (quote != "") {
          out = out character
          if (character == "\\") {
            out = out substr(source, i + 1, 1)
            i += 2
            continue
          }
          if (character == quote) { quote = ""; previous = character }
          i += 1
          continue
        }
        if (in_regex) {
          # A regex literal cannot hold an unescaped `/` outside a character
          # class, so a candidate whose closing slash is the FIRST of a `//`
          # pair was never a regex: the opening `/` was division (or, in a
          # shell file, a path separator) and the `//` is a comment. Bail to
          # the conservative stripper instead of consuming that first slash
          # and returning to code state on the second one, which emitted
          # `  / count; // S1 is not evidence` whole, comment included.
          if (pair == "//" && in_class == 0) { return conservative_text(source) }
          out = out character
          if (character == "\\") {
            out = out substr(source, i + 1, 1)
            i += 2
            continue
          }
          if (character == "[") {
            in_class = 1
          } else if (character == "]") {
            in_class = 0
          } else if (character == "/" && in_class == 0) {
            in_regex = 0
            previous = character
          }
          i += 1
          continue
        }
        if (pair == "/*") { in_block = 1; i += 2; continue }
        if (pair == "//") { break }
        if (character == "#") { break }
        if (character == "\"" || character == SINGLE_QUOTE || character == "`") {
          quote = character
          out = out character
          i += 1
          continue
        }
        if (character == "/" && opens_regex(previous, out)) {
          in_regex = 1
          in_class = 0
          out = out character
          i += 1
          continue
        }
        out = out character
        if (character !~ /[[:space:]]/) { previous = character }
        i += 1
      }
      # Ending outside code state — an unterminated quote, or a regex that
      # never closed because its opening `/` was a wrapped division or a
      # leading path segment — means the line was not parsed. Distrust every
      # boundary it produced and fall back to the conservative stripper.
      # Keying this on the quote alone left the regex case emitting its own
      # trailing comment as evidence.
      if (quote != "" || in_regex) { return conservative_text(source) }
      return out
    }
    BEGIN { in_block = 0; SINGLE_QUOTE = sprintf("%c", 39) }
    {
      line = executable_text($0)
      if (line !~ /^[[:space:]]*$/) print line
    }
  ' "$source_file" >> "$destination"
}

discover_marked_tests() {
  local feature_id="$1"
  local root candidate
  for root in "${TEST_ROOTS[@]}"; do
    [ -d "$root" ] || continue
    while IFS= read -r -d '' candidate; do
      if grep -qE "@spec:${feature_id}([^A-Za-z0-9_-]|$)" "$candidate"; then
        printf '%s\0' "$candidate"
      fi
    done < <(
      find "$root" \
        \( -type d \( \
          -name node_modules -o -name dist -o -name generated -o -name coverage -o \
          -name storybook-static -o -name fixtures -o -name .stryker-tmp -o \
          -name reports -o -name test-results -o -name playwright-report \
        \) -prune \) -o \
        \( -type f \( \
          -name '*.spec.ts' -o -name '*.spec.tsx' -o \
          -name '*.test.ts' -o -name '*.test.tsx' -o \
          -name '*.e2e.ts' -o -name '*.e2e.tsx' -o \
          -name '*.test.mjs' -o -name '*.spec.mjs' -o \
          -name '*.test.cjs' -o -name '*.spec.cjs' -o \
          -name '*.test.js' -o -name '*.spec.js' -o \
          -name '*.test.sh' -o -name '*.spec.sh' \
        \) -print0 \)
    )
  done
}

FEATURES=()
if [ -n "$ONLY" ]; then
  [ -f "$ONLY" ] && ONLY=$(dirname "$ONLY")
  ONLY="${ONLY%/}"
  if [ ! -d "$ONLY" ]; then
    echo "GATE traceability: FAIL — feature dir not found: $ONLY"
    exit 1
  fi
  f=$(ls "$ONLY"/feature.feature 2>/dev/null || ls "$ONLY"/*.feature 2>/dev/null | head -1 || true)
  if [ -z "$f" ]; then
    echo "GATE traceability: FAIL — no feature file in $ONLY"
    exit 1
  fi
  FEATURES+=("$f")
else
  if [ -d specs ]; then
    for d in specs/*/; do
      [ -d "$d" ] || continue
      f=$(ls "${d%/}"/feature.feature 2>/dev/null || ls "${d%/}"/*.feature 2>/dev/null | head -1 || true)
      [ -n "$f" ] && FEATURES+=("$f")
    done
  fi
fi

if [ "${#FEATURES[@]}" -eq 0 ]; then
  echo "GATE traceability: SKIP — no specs/*/ feature files yet (pre-Fase-2 state); nothing to trace. This gate arms itself with the first committed feature."
  exit 0
fi

FAIL=0
CHECKED=0
for FEATURE in "${FEATURES[@]}"; do
  FID=$(basename "$(dirname "$FEATURE")")
  IDS=$(grep -oE '^[[:space:]]*# S[0-9]+' "$FEATURE" | grep -oE 'S[0-9]+' | sort -u)
  if [ -z "$IDS" ]; then
    echo "  FAIL [$FID]: no scenario IDs in $FEATURE"
    FAIL=1
    continue
  fi
  # Test files traceable to this feature: file-level @spec:<feature-dir> marker.
  MARKED=()
  while IFS= read -r -d '' marked_file; do
    MARKED+=("$marked_file")
  done < <(discover_marked_tests "$FID")
  if [ "${#MARKED[@]}" -eq 0 ]; then
    echo "  FAIL [$FID]: no test file under declared roots (${TEST_ROOTS[*]}) carries the marker '@spec:${FID}'"
    FAIL=1
    continue
  fi
  # S-IDs count ONLY on non-comment lines: a comment listing scenario IDs
  # is not a test. (Hardened 2026-07-06 after an unattended loop gamed this
  # gate with a "Traceability anchor: S1..S7" comment block, Art. X.)
  #
  # The filter writes to a temp file instead of piping into `grep -q`: under
  # `set -o pipefail`, `grep -q` exits on the first match and the upstream
  # grep dies of SIGPIPE (141), failing the pipeline even though the ID was
  # found — a timing-dependent flake (surfaced 2026-07-07 as intermittent
  # FAILs on late-stream IDs; a flaky gate is a bug, Art. X).
  NON_COMMENT=$(mktemp)
  : > "$NON_COMMENT"
  for marked_file in "${MARKED[@]}"; do
    append_executable_lines "$marked_file" "$NON_COMMENT"
  done
  for id in $IDS; do
    if ! grep -qE "(^|[^A-Za-z0-9_])${id}([^A-Za-z0-9_]|$)" "$NON_COMMENT"; then
      echo "  FAIL [$FID]: $id has no reference in code lines of the tests marked '@spec:${FID}' (comments do not count)"
      FAIL=1
    fi
  done
  rm -f "$NON_COMMENT"
  CHECKED=$((CHECKED + 1))
done

if [ "$FAIL" -eq 0 ]; then
  echo "GATE traceability: PASS ($CHECKED feature(s); every scenario ID referenced by a test traceable to its own feature)"
fi
exit $FAIL
