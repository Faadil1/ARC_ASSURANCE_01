#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p build/out

echo "== 1/9 pinned Arc Foundry =="
bash script/install-pinned-arc-foundry.sh
export PATH="$ROOT/.tooling/bin:$PATH"
export ARC_FORGE="$ROOT/.tooling/bin/arc-forge"
export ARC_CAST="$ROOT/.tooling/bin/arc-cast"
export ARC_FOUNDRY_SOURCE_DIR="$ROOT/.tooling/arc-foundry-src"

echo "== 2/9 pinned Solidity dependencies =="
bash script/bootstrap-pinned-deps.sh

echo "== 3/9 Node lock candidate + JS tests =="
rm -f package-lock.json
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
cp package-lock.json build/out/package-lock.candidate.json
npm ci --ignore-scripts --no-audit --no-fund

VIEM_VERSION="$(node -p "require('./node_modules/viem/package.json').version")"
[ "$VIEM_VERSION" = "2.56.9" ] || {
  echo "viem version mismatch: $VIEM_VERSION" >&2
  exit 1
}

npm ls --all --json > build/out/npm-tree.json
npm run test:all-js

echo "== 4/9 Arc Foundry tests =="
FOUNDRY_PROFILE=arc "$ARC_FORGE" config --json > build/out/arc-foundry-config.json
jq -e '.network == "arc"' build/out/arc-foundry-config.json >/dev/null
FOUNDRY_PROFILE=arc "$ARC_FORGE" test -vv

echo "== 5/9 exact-commit bytecode manifest =="
bash script/reproducible-build.sh > build/out/reproducible-build.log

echo "== 6/9 deterministic JS golden vector =="
npm run golden:generate:js > build/out/golden-js.json

echo "== 7/9 deterministic Solidity golden vector + comparison =="
FOUNDRY_PROFILE=arc "$ARC_FORGE" script \
  script/GenerateGoldenVector.s.sol:GenerateGoldenVector
npm run golden:compare | tee build/out/golden-comparison.json

echo "== 8/9 independent double build =="
bash script/reproducibility-double-build.sh \
  | tee build/out/reproducibility-run.log

echo "== 9/9 predeploy manifest =="
npm run deploy:manifest > build/out/deployment-manifest.log
npm run deploy:manifest:verify \
  | tee build/out/deployment-manifest-verification.json

rm -f package-lock.json

cat > build/out/gate-summary.json <<'JSON'
{
  "gate": "REPRODUCIBLE_BUILD_DEPLOYMENT_V1",
  "contract_build_reproducibility": "PROVEN_IF_THIS_RUN_SUCCEEDED",
  "cross_language_golden_vector": "PROVEN_IF_THIS_RUN_SUCCEEDED",
  "solidity_tests": "PROVEN_IF_THIS_RUN_SUCCEEDED",
  "javascript_tests": "PROVEN_FOR_THIS_RESOLVED_DEPENDENCY_TREE_IF_THIS_RUN_SUCCEEDED",
  "node_lockfile_canonical": false,
  "deployment": "NOT_RUN",
  "mainnet_value_movement": "NOT_RUN",
  "truth_boundary": "A successful clean-room run proves local build/test reproducibility, not Arc deployment or live financial causality."
}
JSON

echo
echo "REPRODUCIBLE BUILD GATE COMPLETE"
cat build/out/gate-summary.json
