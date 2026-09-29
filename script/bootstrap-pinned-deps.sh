#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/build/dependencies.lock.json"

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

checkout_exact() {
  local repo="$1"
  local sha="$2"
  local dest="$3"

  if [ -d "$dest/.git" ]; then
    local current
    current="$(git -C "$dest" rev-parse HEAD)"
    if [ "$current" = "$sha" ]; then
      echo "ok - $dest @ $sha"
      return
    fi
    rm -rf "$dest"
  elif [ -e "$dest" ]; then
    rm -rf "$dest"
  fi

  mkdir -p "$dest"
  git -C "$dest" init -q
  git -C "$dest" remote add origin "https://github.com/$repo.git"
  git -C "$dest" fetch -q --depth 1 origin "$sha"
  git -C "$dest" checkout -q --detach FETCH_HEAD

  local resolved
  resolved="$(git -C "$dest" rev-parse HEAD)"
  [ "$resolved" = "$sha" ] || {
    echo "dependency SHA mismatch for $repo: $resolved != $sha" >&2
    exit 1
  }

  echo "installed - $repo @ $sha"
}

FORGE_STD_REPO="$(jq -r '.contract_build.forge_std.repository' "$LOCK")"
FORGE_STD_SHA="$(jq -r '.contract_build.forge_std.commit' "$LOCK")"
OZ_REPO="$(jq -r '.contract_build.openzeppelin_contracts.repository' "$LOCK")"
OZ_SHA="$(jq -r '.contract_build.openzeppelin_contracts.commit' "$LOCK")"

mkdir -p "$ROOT/lib"
checkout_exact "$FORGE_STD_REPO" "$FORGE_STD_SHA" "$ROOT/lib/forge-std"
checkout_exact "$OZ_REPO" "$OZ_SHA" "$ROOT/lib/openzeppelin-contracts"

echo "Pinned Solidity dependencies are ready."
