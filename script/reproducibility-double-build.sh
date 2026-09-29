#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ARC_FORGE="${ARC_FORGE:-$ROOT/.tooling/bin/arc-forge}"
ARC_CAST="${ARC_CAST:-$ROOT/.tooling/bin/arc-cast}"
ARC_SOURCE="${ARC_FOUNDRY_SOURCE_DIR:-$ROOT/.tooling/arc-foundry-src}"

for name in a b; do
  git clone -q --no-hardlinks "$ROOT" "$TMP/$name"
  (
    cd "$TMP/$name"
    bash ./script/bootstrap-pinned-deps.sh
    ARC_FORGE="$ARC_FORGE" \
    ARC_CAST="$ARC_CAST" \
    ARC_FOUNDRY_SOURCE_DIR="$ARC_SOURCE" \
    BUILD_OUT_DIR="$TMP/$name-manifest" \
      bash ./script/reproducible-build.sh >/dev/null
  )
done

jq '{
  source,
  contract,
  toolchain,
  settings,
  creation_bytecode_hash,
  runtime,
  source_hashes
}' "$TMP/a-manifest/AssuranceVault.build-manifest.json" | jq -S . > "$TMP/a.json"

jq '{
  source,
  contract,
  toolchain,
  settings,
  creation_bytecode_hash,
  runtime_bytecode_hash,
  source_hashes
}' "$TMP/b-manifest/AssuranceVault.build-manifest.json" | jq -S . > "$TMP/b.json"

if ! cmp -s "$TMP/a.json" "$TMP/b.json"; then
  echo "REPRODUCIBILITY_MISMATCH" >&2
  diff -u "$TMP/a.json" "$TMP/b.json" || true
  exit 1
fi

mkdir -p "$ROOT/build/out"
jq -n \
  --arg verdict "REPRODUCIBLE_BUILD_PROVEN_FOR_EXACT_COMMIT" \
  --slurpfile comparison "$TMP/a.json" \
  '{
    ok:true,
    verdict:$verdict,
    comparison:$comparison[0],
    live_claim:false
  }' > "$ROOT/build/out/reproducibility-proof.json"

cat "$ROOT/build/out/reproducibility-proof.json"
