#!/usr/bin/env bash
# Idempotent fix for Outcome Ledger monorepo on Railway.
# Sets rootDirectory + config file per service so GitHub deploys use Dockerfile, not Railpack.
#
# Usage:
#   export RAILWAY_TOKEN="..."   # or be logged in via `railway login`
#   ./scripts/railway-ensure-monorepo.sh
#
# See docs/railway-github-connect.md

set -euo pipefail

PROJECT_ID="${RAILWAY_PROJECT_ID:-ffec287d-1920-4838-bcbb-fdb10fc8baba}"
ENV_ID="${RAILWAY_ENV_ID:-8c0ed957-6859-4cff-8068-d1f2234fb45b}"
API="${RAILWAY_API:-https://backboard.railway.com/graphql/v2}"

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  CONFIG="${HOME}/.railway/config.json"
  if [[ -f "$CONFIG" ]]; then
    RAILWAY_TOKEN="$(python3 -c "import json; print(json.load(open('$CONFIG'))['user']['token'])" 2>/dev/null || true)"
  fi
fi

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "error: set RAILWAY_TOKEN or run railway login" >&2
  exit 1
fi

gql() {
  local query="$1"
  curl -sf "$API" \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":$(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$query")}"
}

update_service() {
  local service_id="$1"
  local root_dir="$2"
  local config_file="$3"
  local name="$4"
  echo "→ $name: rootDirectory=$root_dir config=$config_file"
  gql "mutation {
    serviceInstanceUpdate(
      serviceId: \"$service_id\"
      environmentId: \"$ENV_ID\"
      input: { rootDirectory: \"$root_dir\", railwayConfigFile: \"$config_file\" }
    )
  }" | python3 -c "
import json,sys
r=json.load(sys.stdin)
if r.get('errors'):
    print(json.dumps(r, indent=2), file=sys.stderr)
    sys.exit(1)
print('  ok')
"
}

# Service IDs (production) — update if you recreate services
update_service "c11988b5-71ab-4cdd-b9ff-5d47e01a1da9" "api" "/api/railway.toml" "outcome-ledger (API)"
update_service "86d88052-3c7c-496e-a7c6-4d15c1a70da7" "dashboard" "/dashboard/railway.toml" "outcome-ledger-dashboard"
update_service "eda200a6-6a43-4d6d-a372-e601a4c154cb" "landing" "/landing/railway.toml" "outcome-ledger-landing"

echo ""
echo "Verifying service instances..."
gql "query {
  project(id: \"$PROJECT_ID\") {
    services {
      edges {
        node {
          name
          serviceInstances {
            edges {
              node { rootDirectory railwayConfigFile }
            }
          }
        }
      }
    }
  }
}" | python3 -c "
import json,sys
data=json.load(sys.stdin)['data']['project']['services']['edges']
for edge in data:
    name=edge['node']['name']
    if name=='Postgres':
        continue
    inst=edge['node']['serviceInstances']['edges'][0]['node']
    print(f\"  {name}: root={inst['rootDirectory']!r} config={inst['railwayConfigFile']!r}\")
"

echo ""
echo "Done. GitHub pushes should now build with Dockerfile per service."
echo "Optional: disable duplicate deploys — use only .github/workflows/railway-deploy.yml OR only GitHub source (not both)."
