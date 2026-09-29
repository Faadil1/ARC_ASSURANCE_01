#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/build/dependencies.lock.json"
BIN_DIR="${ARC_FOUNDRY_BIN_DIR:-$ROOT/.tooling/bin}"
DOWNLOAD_DIR="${ARC_FOUNDRY_DOWNLOAD_DIR:-$ROOT/.tooling/downloads}"
SOURCE_DIR="${ARC_FOUNDRY_SOURCE_DIR:-$ROOT/.tooling/arc-foundry-src}"
TARGET_DIR="${ARC_FOUNDRY_TARGET_DIR:-$ROOT/.tooling/arc-foundry-target}"
MODE="${ARC_FOUNDRY_INSTALL_MODE:-release}"

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "sha256sum is required" >&2; exit 1; }

REPO="$(jq -r '.contract_build.arc_foundry.repository' "$LOCK")"
SHA="$(jq -r '.contract_build.arc_foundry.commit' "$LOCK")"
TAG="$(jq -r '.contract_build.arc_foundry.release.tag' "$LOCK")"
TAG_SHA="$(jq -r '.contract_build.arc_foundry.release.tag_commit' "$LOCK")"

[ "$SHA" = "$TAG_SHA" ] || {
  echo "Arc Foundry release tag/source commit mismatch in lock" >&2
  exit 1
}

install_release() {
  command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
  command -v tar >/dev/null || { echo "tar is required" >&2; exit 1; }

  local os arch target
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os/$arch" in
    Linux/x86_64|Linux/amd64)
      target="x86_64-unknown-linux-gnu"
      ;;
    Linux/aarch64|Linux/arm64)
      target="aarch64-unknown-linux-gnu"
      ;;
    Darwin/arm64|Darwin/aarch64)
      target="aarch64-apple-darwin"
      ;;
    *)
      echo "No pinned precompiled Arc Foundry asset for $os/$arch; use ARC_FOUNDRY_INSTALL_MODE=source" >&2
      exit 2
      ;;
  esac

  local url expected archive actual tmp
  url="$(jq -r --arg t "$target" '.contract_build.arc_foundry.release.assets[$t].url // empty' "$LOCK")"
  expected="$(jq -r --arg t "$target" '.contract_build.arc_foundry.release.assets[$t].sha256 // empty' "$LOCK")"

  [ -n "$url" ] && [ -n "$expected" ] || {
    echo "Missing release asset lock for $target" >&2
    exit 1
  }

  mkdir -p "$DOWNLOAD_DIR" "$BIN_DIR"
  archive="$DOWNLOAD_DIR/arc-foundry-$TAG-$target.tar.gz"

  if [ ! -f "$archive" ]; then
    curl -fL --retry 3 --retry-delay 2 "$url" -o "$archive"
  fi

  actual="$(sha256sum "$archive" | awk '{print $1}')"
  [ "$actual" = "$expected" ] || {
    echo "Arc Foundry archive checksum mismatch: $actual != $expected" >&2
    rm -f "$archive"
    exit 1
  }

  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN
  tar -xzf "$archive" -C "$tmp"

  for tool in forge cast anvil; do
    [ -f "$tmp/$tool" ] || {
      echo "Arc Foundry archive missing $tool" >&2
      exit 1
    }
    cp "$tmp/$tool" "$BIN_DIR/arc-$tool"
    chmod +x "$BIN_DIR/arc-$tool"
  done

  printf '%s\n' "$expected" > "$BIN_DIR/arc-foundry-release-archive.sha256"
  printf '%s\n' "$SHA" > "$BIN_DIR/arc-foundry-source-commit.txt"
  printf '%s\n' "$TAG" > "$BIN_DIR/arc-foundry-release-tag.txt"

  echo "Arc Foundry release: $TAG"
  echo "Arc Foundry source commit: $SHA"
  echo "Verified archive sha256: $expected"
  "$BIN_DIR/arc-forge" --version
}

install_source() {
  command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
  command -v cargo >/dev/null || { echo "cargo is required" >&2; exit 1; }

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

  printf '%s\n' "$SHA" > "$BIN_DIR/arc-foundry-source-commit.txt"
  printf '%s\n' "SOURCE_BUILD" > "$BIN_DIR/arc-foundry-release-tag.txt"

  echo "Arc Foundry source: $SHA"
  "$BIN_DIR/arc-forge" --version
}

case "$MODE" in
  release)
    install_release
    ;;
  source)
    install_source
    ;;
  *)
    echo "Unknown ARC_FOUNDRY_INSTALL_MODE=$MODE (release|source)" >&2
    exit 1
    ;;
esac
