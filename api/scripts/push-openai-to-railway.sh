#!/usr/bin/env bash
# Push OPENAI_* from api/.env to Railway (outcome-ledger API service).
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE="${1:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi
get_var() { grep -E "^${1}=" "$ENV_FILE" | head -1 | cut -d= -f2- || true; }
KEY=$(get_var OPENAI_API_KEY)
ORG=$(get_var OPENAI_ORG_ID)
if [[ -z "$KEY" ]]; then
  echo "OPENAI_API_KEY is empty in $ENV_FILE — paste your org admin key first."
  exit 1
fi
railway service link outcome-ledger
ARGS=( "OPENAI_API_KEY=$KEY" )
[[ -n "$ORG" ]] && ARGS+=( "OPENAI_ORG_ID=$ORG" )
railway variables set "${ARGS[@]}"
echo "Done. Test: curl -X POST https://outcome-ledger-production.up.railway.app/v1/jobs/test-openai -H \"X-Api-Key: \$OUTCOME_LEDGER_API_KEY\""
