#!/usr/bin/env bash
set -euo pipefail

die() { echo "REPRO_BUILD_ABORT: $*" >&2; exit 1; }

command -v node >/dev/null || die "node missing"
command -v npm >/dev/null || die "npm missing"
command -v forge >/dev/null || die "forge missing"
command -v git >/dev/null || die "git missing"

[ "$(node -v)" = "v22.16.0" ]   || die "node must be exactly v22.16.0"

[ -f package-lock.json ]   || die "package-lock.json missing: transitive Node dependency lock is not yet committed"

echo "== clean install =="
npm ci --ignore-scripts --no-audit --no-fund

if [ ! -d lib/forge-std ]; then
  forge install foundry-rs/forge-std@v1.16.1 --no-git
fi

if [ ! -d lib/openzeppelin-contracts ]; then
  forge install OpenZeppelin/openzeppelin-contracts@v5.6.1 --no-git
fi

echo "== deterministic public golden vector =="
npm run golden:write
cp fixtures/golden/provider-output-pass-v1.json /tmp/arc-golden-1.json
npm run golden:write
cmp /tmp/arc-golden-1.json fixtures/golden/provider-output-pass-v1.json   || die "golden vector is not deterministic"

echo "== JS tests =="
npm run test:all-js

echo "== Solidity build =="
forge build

echo "== reproducible build manifest =="
npm run build:manifest

echo "== Solidity tests incl. cross-language vector =="
forge test -vv

echo "REPRO_BUILD_LOCAL_VERIFIED_CANDIDATE"
