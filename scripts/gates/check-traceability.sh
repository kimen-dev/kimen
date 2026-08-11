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
# evidence.
#
# TWO LEXERS, CHOSEN BY EXTENSION. One JavaScript-shaped lexer applied to every
# discovered file was the root cause of three consecutive defects: it made `#`
# a comment marker in JavaScript (where it is a private field, a selector, or
# string content) and it gave shell files regex-literal state (where `/` is
# nothing but a path separator and regex literals do not exist). Splitting
# removes both classes rather than patching their symptoms.
#
#   .mjs .js .cjs .ts .tsx  → JavaScript: `//`, `/* */`, single and double
#                             quotes, template literals, regex literals.
#                             `#` is NOT a comment marker.
#   .sh                     → shell: `#`, single and double quotes. No
#                             regex-literal state and no `//` comments.
#
# Within each lexer this is a single left-to-right scan whose states cannot be
# recognized independently — whichever is entered first wins. Each state is
# here because leaving it out produced a real defect:
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
#     string swallows the terminator of the comment itself.
#   - regex literals: `const re = /don't/u;  // S3 is not evidence` has the
#     apostrophe in neither a string nor a comment. Without this state the
#     apostrophe opens a phantom string, the trailing `//` is never seen, and
#     the comment counts as evidence.
#
# WHEN A LINE CANNOT BE PARSED. Block-comment state carries across lines, by
# necessity. String and regex state do not: a line that ends in either one is
# discarded and the raw line is re-stripped conservatively (block-comment
# pairs, then everything from the first comment marker) as the pre-2026-08-11
# implementation did. A candidate regex that runs into an unescaped `//` or
# `/*` outside a character class is treated the same way, because a regex
# literal can contain neither: that combination means the opening `/` was
# really division or a path separator, and what follows is a comment.
#
# WHAT IS KNOWN TO DEFEAT IT, AS OF THIS COMMIT. This is a heuristic lexer,
# not a parser. THE LIST BELOW IS NOT PROVED EXHAUSTIVE — three consecutive
# reviews each found shapes the previous round's list did not contain, so read
# it as the current state of knowledge and probe (method at the end) before
# concluding that a new suspicion is or is not covered.
#
#   1. JavaScript. A `/` after `)` or `]` that really opens a regex is read as
#      division, because telling those apart needs a real parser. If that
#      regex's contents hold an odd number of quote characters, the leftover
#      quote opens a phantom string; should a matching quote then appear inside
#      a trailing comment (`// doesn't count`), the phantom string closes
#      there, the comment marker is never seen, and THE COMMENT IS EMITTED AS
#      EVIDENCE. This direction INVENTS evidence: the gate can report PASS on
#      an S-ID that only ever appeared in prose. It remains open.
#   2. JavaScript. A `/*` inside a multi-line template literal opens block
#      state, which then truncates every line up to the next `*/`. This
#      direction LOSES evidence: FAIL for an S-ID a test really covers. Noisy,
#      not dangerous.
#
# The two directions are not equivalent and there is no single safe direction.
# Any change here has to be argued and measured against both rules at once:
# coverage (every S-ID has a test) wants more lines visible, evidence
# integrity (comments never count) wants fewer. Wording that implies one safe
# direction has twice been wrong in this file; do not reintroduce it.
#
# HOW TO PROBE A NEW SUSPICION. Build the scanner standalone and feed it the
# shape, using the real extension — the two lexers fail differently:
#
#   sed -n '/^append_executable_lines()/,/^}$/p' \
#     scripts/gates/check-traceability.sh > /tmp/fn.sh && . /tmp/fn.sh
#   printf '%s\n' '  / count; // S9 is not evidence' > /tmp/probe.mjs
#   : > /tmp/out.txt && append_executable_lines /tmp/probe.mjs /tmp/out.txt
#   grep -n S9 /tmp/out.txt
#
# A hit whose only source is a comment is a false-PASS shape: add a fixture to
# scripts/tests/traceability.test.mjs that fails on it, then fix it.
append_executable_lines() {
  local source_file="$1"
  local destination="$2"
  local lexer=javascript
  case "$source_file" in
    *.sh) lexer=shell ;;
  esac
  awk -v LEXER="$lexer" '
    # A `/` opens a regex literal only where an expression may begin: at the
    # start of a line, after an operator or opening bracket, or after a keyword
    # that cannot be followed by division. After a value (identifier, literal,
    # `)`, `]`) it is division.
    #
    # `<` is deliberately NOT an opener. It is legal JavaScript (`a < /re/`)
    # and nobody writes it, while `</a>` ends every JSX closing tag in the
    # .tsx spec files this gate reads. Treating it as an opener made those
    # lines fall to the conservative stripper, which cut them at the first
    # comment marker anywhere on the line — including inside a string, so
    # `it("S5 targets #main and S6", …)` silently lost S6.
    #
    # The keyword list exists for `return /…/`, ordinary test-file code:
    # without it the `/` reads as division and an apostrophe inside the literal
    # opens a phantom string.
    function opens_regex(previous, code_so_far) {
      if (previous == "" || index("([{,;:=!&|?+-*%~^>", previous) > 0) { return 1 }
      return match(code_so_far, /(^|[^A-Za-z0-9_$])(return|typeof|case|in|of|new|delete|void|do|else|yield|await|throw)[[:space:]]*$/) > 0
    }
    # The pre-2026-08-11 stripper, kept as the fallback for a line the scanner
    # could not parse. Conservative by construction: it cuts at the FIRST
    # comment marker, even one inside a string.
    function conservative_text(source,   text, prefix, suffix) {
      text = source
      if (LEXER == "shell") {
        sub(/[[:space:]]*#.*/, "", text)
        return text
      }
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
        if (LEXER == "shell") {
          if (character == "#") { break }
          if (character == "\"" || character == SINGLE_QUOTE) {
            quote = character
            out = out character
            i += 1
            continue
          }
          out = out character
          i += 1
          continue
        }
        if (in_regex) {
          # A regex literal can hold neither an unescaped `//` nor an
          # unescaped `/*` outside a character class, so a candidate that runs
          # into one was never a regex: the opening `/` was division (or a
          # path separator) and what follows is a comment. Bail to the
          # conservative stripper instead of consuming the first slash of the
          # comment as the terminator of the regex and returning to code state
          # on the second, which emitted the comment as evidence.
          if (in_class == 0 && (pair == "//" || pair == "/*")) {
            return conservative_text(source)
          }
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
