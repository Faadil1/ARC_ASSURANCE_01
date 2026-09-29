#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/build/dependencies.lock.json"
OUT_DIR="${BUILD_OUT_DIR:-$ROOT/build/out}"
ARC_FORGE="${ARC_FORGE:-$ROOT/.tooling/bin/arc-forge}"
ARC_CAST="${ARC_CAST:-$ROOT/.tooling/bin/arc-cast}"
ARC_FOUNDRY_SOURCE_DIR="${ARC_FOUNDRY_SOURCE_DIR:-$ROOT/.tooling/arc-foundry-src}"
ARC_FOUNDRY_BIN_DIR="${ARC_FOUNDRY_BIN_DIR:-$ROOT/.tooling/bin}"

for cmd in git jq sha256sum; do
  command -v "$cmd" >/dev/null || { echo "$cmd is required" >&2; exit 1; }
done

[ -x "$ARC_FORGE" ] || { echo "missing arc-forge: $ARC_FORGE" >&2; exit 1; }
[ -x "$ARC_CAST" ] || { echo "missing arc-cast: $ARC_CAST" >&2; exit 1; }

if [ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]; then
  echo "tracked working tree must be clean for reproducible build" >&2
  exit 1
fi

check_dep() {
  local path="$1"
  local expected="$2"
  [ -d "$path/.git" ] || { echo "missing dependency: $path" >&2; exit 1; }
  local actual
  actual="$(git -C "$path" rev-parse HEAD)"
  [ "$actual" = "$expected" ] || {
    echo "dependency mismatch: $path $actual != $expected" >&2
    exit 1
  }
}

FORGE_STD_SHA="$(jq -r '.contract_build.forge_std.commit' "$LOCK")"
OZ_SHA="$(jq -r '.contract_build.openzeppelin_contracts.commit' "$LOCK")"
ARC_SHA="$(jq -r '.contract_build.arc_foundry.commit' "$LOCK")"

check_dep "$ROOT/lib/forge-std" "$FORGE_STD_SHA"
check_dep "$ROOT/lib/openzeppelin-contracts" "$OZ_SHA"

ARC_INSTALL_COMMIT_FILE="$ARC_FOUNDRY_BIN_DIR/arc-foundry-source-commit.txt"
[ -f "$ARC_INSTALL_COMMIT_FILE" ] || {
  echo "missing Arc Foundry provenance file: $ARC_INSTALL_COMMIT_FILE" >&2
  exit 1
}
ARC_INSTALLED_SHA="$(cat "$ARC_INSTALL_COMMIT_FILE")"
[ "$ARC_INSTALLED_SHA" = "$ARC_SHA" ] || {
  echo "Arc Foundry installed source commit mismatch: $ARC_INSTALLED_SHA != $ARC_SHA" >&2
  exit 1
}

ARC_RELEASE_TAG_FILE="$ARC_FOUNDRY_BIN_DIR/arc-foundry-release-tag.txt"
ARC_RELEASE_TAG="$(cat "$ARC_RELEASE_TAG_FILE" 2>/dev/null || echo UNKNOWN)"
ARC_RELEASE_ARCHIVE_SHA="$(cat "$ARC_FOUNDRY_BIN_DIR/arc-foundry-release-archive.sha256" 2>/dev/null || echo SOURCE_BUILD)"
ARC_FORGE_BINARY_SHA="$(sha256sum "$ARC_FORGE" | awk '{print $1}')"

mkdir -p "$OUT_DIR"

CONFIG_JSON="$OUT_DIR/foundry-config.json"
(
  cd "$ROOT"
  FOUNDRY_PROFILE=arc "$ARC_FORGE" config --json > "$CONFIG_JSON"
)

jq -e '.network == "arc"' "$CONFIG_JSON" >/dev/null || {
  echo "Arc profile did not resolve network=arc" >&2
  exit 1
}

(
  cd "$ROOT"
  FOUNDRY_PROFILE=arc "$ARC_FORGE" clean
  FOUNDRY_PROFILE=arc "$ARC_FORGE" build --force
)

ARTIFACT="$ROOT/out/AssuranceVault.sol/AssuranceVault.json"
[ -f "$ARTIFACT" ] || { echo "missing AssuranceVault artifact" >&2; exit 1; }

CREATION="$(jq -r '.bytecode.object' "$ARTIFACT")"
RUNTIME="$(jq -r '.deployedBytecode.object' "$ARTIFACT")"
[ "$CREATION" != "null" ] && [ "$CREATION" != "0x" ] || { echo "empty creation bytecode" >&2; exit 1; }
[ "$RUNTIME" != "null" ] && [ "$RUNTIME" != "0x" ] || { echo "empty runtime bytecode" >&2; exit 1; }

RUNTIME_PROVENANCE="$OUT_DIR/runtime-provenance.json"
node "$ROOT/script/extract-runtime-provenance.mjs" "$ARTIFACT" > "$RUNTIME_PROVENANCE"
NORMALIZED_RUNTIME="$(jq -r '.normalized_runtime_bytecode' "$RUNTIME_PROVENANCE")"

CREATION_HASH="$("$ARC_CAST" keccak "$CREATION")"
RUNTIME_TEMPLATE_HASH="$("$ARC_CAST" keccak "$RUNTIME")"
NORMALIZED_RUNTIME_HASH="$("$ARC_CAST" keccak "$NORMALIZED_RUNTIME")"

GIT_SHA="$(git -C "$ROOT" rev-parse HEAD)"
TREE_SHA="$(git -C "$ROOT" rev-parse HEAD^{tree})"
ARC_VERSION="$("$ARC_FORGE" --version | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
SOLC_PIN="$(jq -r '.contract_build.solc' "$LOCK")"

sha_file() { sha256sum "$1" | awk '{print $1}'; }

jq -n \
  --arg version "ARC_ASSURANCE_REPRO_BUILD_V1" \
  --arg source_commit "$GIT_SHA" \
  --arg source_tree "$TREE_SHA" \
  --arg contract "src/assurance/AssuranceVault.sol:AssuranceVault" \
  --arg solc "$SOLC_PIN" \
  --arg arc_foundry_commit "$ARC_SHA" \
  --arg arc_foundry_version "$ARC_VERSION" \
  --arg arc_foundry_release_tag "$ARC_RELEASE_TAG" \
  --arg arc_foundry_release_archive_sha256 "$ARC_RELEASE_ARCHIVE_SHA" \
  --arg arc_forge_binary_sha256 "$ARC_FORGE_BINARY_SHA" \
  --arg forge_std_commit "$FORGE_STD_SHA" \
  --arg openzeppelin_commit "$OZ_SHA" \
  --arg creation_hash "$CREATION_HASH" \
  --arg runtime_template_hash "$RUNTIME_TEMPLATE_HASH" \
  --arg normalized_runtime_hash "$NORMALIZED_RUNTIME_HASH" \
  --slurpfile runtime_provenance "$RUNTIME_PROVENANCE" \
  --arg source_sha256 "$(sha_file "$ROOT/src/assurance/AssuranceVault.sol")" \
  --arg eip712_sha256 "$(sha_file "$ROOT/src/eip712/ProviderOutputEIP712.sol")" \
  --arg foundry_toml_sha256 "$(sha_file "$ROOT/foundry.toml")" \
  --arg remappings_sha256 "$(sha_file "$ROOT/remappings.txt")" \
  '{
    version:$version,
    source:{commit:$source_commit,tree:$source_tree},
    contract:$contract,
    toolchain:{
      solc:$solc,
      arc_foundry:{
        commit:$arc_foundry_commit,
        version_output:$arc_foundry_version,
        release_tag:$arc_foundry_release_tag,
        release_archive_sha256:$arc_foundry_release_archive_sha256,
        arc_forge_binary_sha256:$arc_forge_binary_sha256
      },
      forge_std_commit:$forge_std_commit,
      openzeppelin_contracts_commit:$openzeppelin_commit
    },
    settings:{foundry_profile:"arc",network:"arc",optimizer:true,optimizer_runs:200},
    creation_bytecode_hash:$creation_hash,
    runtime:{
      template_hash:$runtime_template_hash,
      normalized_hash:$normalized_runtime_hash,
      immutable_references:$runtime_provenance[0].immutable_references,
      immutable_reference_count:$runtime_provenance[0].immutable_reference_count,
      comparison_rule:"Zero immutable byte ranges in observed Arc runtime before hashing; separately verify public immutable getters."
    },
    source_hashes:{
      assurance_vault_sha256:$source_sha256,
      provider_output_eip712_sha256:$eip712_sha256,
      foundry_toml_sha256:$foundry_toml_sha256,
      remappings_sha256:$remappings_sha256
    },
    evidence_class:"LOCAL_BUILD_ARTIFACT",
    live_deployment:false
  }' > "$OUT_DIR/AssuranceVault.build-manifest.json"

jq . "$OUT_DIR/AssuranceVault.build-manifest.json"
