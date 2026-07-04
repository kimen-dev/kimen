#!/usr/bin/env bash
# Resolve action tag pins in .github/workflows/*.yml to commit SHAs (Art. X).
# Run locally (requires the GitHub CLI, authenticated): bash scripts/pin-actions.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }

for f in .github/workflows/*.yml; do
  while IFS= read -r line; do
    ref=$(echo "$line" | grep -oE 'uses: [^ ]+@[^ ]+' | sed 's/uses: //') || continue
    [ -z "$ref" ] && continue
    repo="${ref%@*}"; tag="${ref#*@}"
    [[ "$tag" =~ ^[0-9a-f]{40}$ ]] && continue  # already pinned
    sha=$(gh api "repos/$repo/git/ref/tags/$tag" --jq '.object.sha' 2>/dev/null || true)
    # annotated tags point to a tag object; dereference to the commit
    type=$(gh api "repos/$repo/git/tags/$sha" --jq '.object.sha' 2>/dev/null || true)
    [ -n "$type" ] && sha="$type"
    if [ -n "$sha" ]; then
      sed -i.bak "s|uses: $repo@$tag # TODO-pin-sha|uses: $repo@$sha # $tag|" "$f" && rm -f "$f.bak"
      echo "pinned: $repo@$tag -> $sha"
    else
      echo "WARN: could not resolve $repo@$tag"
    fi
  done < <(grep -E 'uses: .+# TODO-pin-sha' "$f")
done
echo "Done. Review the diff and commit."
