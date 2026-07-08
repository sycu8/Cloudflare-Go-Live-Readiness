#!/usr/bin/env bash
# QA inventory runner — logs results to tests/qa/results.log
set -uo pipefail
CLI="node dist/index.js"
FIXTURES="tests/fixtures"
LOG="tests/qa/results.log"
: > "$LOG"

run() {
  local id="$1"
  shift
  echo "=== QA-$id: $* ===" | tee -a "$LOG"
  local ec=0
  "$@" >> "$LOG" 2>&1 || ec=$?
  echo "EXIT: $ec" | tee -a "$LOG"
  echo "" | tee -a "$LOG"
  return $ec
}

cd "$(dirname "$0")/../.."
npm run build -s

# Global
run "G01" $CLI --version
run "G02" $CLI --help
run "G03" $CLI scan --help
run "G04" $CLI fix --help
run "G05" $CLI smoke-test --help

# Fixtures — scan
for f in nextjs-app vite-app express-app static-site; do
  run "S-$f" $CLI scan --cwd "$FIXTURES/$f" --json
done

# inspect
run "I01" $CLI inspect --cwd "$FIXTURES/nextjs-app" --json
run "I02" $CLI inspect --cwd "$FIXTURES/vite-app"

# migration-plan, security, ai, seo
run "M01" $CLI migration-plan --cwd "$FIXTURES/nextjs-app"
run "SEC01" $CLI security-scan --cwd "$FIXTURES/nextjs-app" --json
run "AI01" $CLI ai-ready --cwd "$FIXTURES/vite-app"
run "SEO01" $CLI seo-ready --cwd "$FIXTURES/vite-app"

# fix
run "F01" $CLI fix --cwd "$FIXTURES/static-site" 2>&1 || true
run "F02" $CLI fix --ai-readiness --cwd "$FIXTURES/static-site"
run "F03" $CLI fix --ai-readiness --cwd "$FIXTURES/static-site"  # skip existing
run "F04" $CLI fix --seo --cwd "$FIXTURES/static-site"
run "F05" $CLI fix --seo --force --cwd "$FIXTURES/static-site"

# report, deploy-check
run "R01" $CLI report --cwd "$FIXTURES/express-app"
run "D01" $CLI deploy-check --cwd "$FIXTURES/nextjs-app" --json

# Edge cases
run "E01" $CLI scan --cwd /nonexistent/path 2>&1 || true
run "E02" $CLI scan --cwd "$FIXTURES/nextjs-app" --config /bad/config.json 2>&1 || true
run "E03" $CLI smoke-test 2>&1 || true
run "E04" $CLI scan --cwd "$FIXTURES/static-site" --no-color --verbose

echo "QA run complete. See $LOG"
