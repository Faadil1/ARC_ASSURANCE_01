#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/build/dependencies.lock.json"
SOURCE_DIR="${ARC_FOUNDRY_SOURCE_DIR:-$ROOT/.tooling/arc-foundry-src}"
BIN_DIR="${ARC_FOUNDRY_BIN_DIR:-$ROOT/.tooling/bin}"
TARGET_DIR="${ARC_FOUNDRY_TARGET_DIR:-$ROOT/.tooling/arc-foundry-target}"

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v cargo >/dev/null || { echo "cargo is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

REPO="$(jq -r '.contract_build.arc_foundry.repository' "$LOCK")"
SHA="$(jq -r '.contract_build.arc_foundry.commit' "$LOCK")"

if [ ! -d "$SOURCE_DIR/.git" ] || [ "$(git -C "$SOURCE_DIR" rev-parse HEAD 2>/dev/null || true)" != "$SHA" ]; then
  rm -rf "$SOURCE_DIR"
  mkdir -p "$SOURCE_DIR"
  git -C "$SOURCE_DIR" init -q
  git -C "$SOURCE_DIR" remote add origin "https://github.com/$REPO.git"
  git -C "$SOURCE_DIR" fetch -q --depth 1 origin "$SHA"
  git -C "$SOURCE_DIR" checkout -q --detach FETCH_HEAD
fi

[ "$(git -C "$SOURCE_DIR" rev-parse HEAD)" = "$SHA" ] || {
  echo "Arc Foundry source SHA mismatch" >&2
  exit 1
}

mkdir -p "$TARGET_DIR"
(
  cd "$SOURCE_DIR"
  CARGO_TARGET_DIR="$TARGET_DIR" \
    cargo build --release --locked --bin forge --bin cast --bin anvil
)

mkdir -p "$BIN_DIR"
cp "$TARGET_DIR/release/forge" "$BIN_DIR/arc-forge"
cp "$TARGET_DIR/release/cast" "$BIN_DIR/arc-cast"
cp "$TARGET_DIR/release/anvil" "$BIN_DIR/arc-anvil"
chmod +x "$BIN_DIR/arc-forge" "$BIN_DIR/arc-cast" "$BIN_DIR/arc-anvil"

echo "Arc Foundry source: $SHA"
"$BIN_DIR/arc-forge" --version
