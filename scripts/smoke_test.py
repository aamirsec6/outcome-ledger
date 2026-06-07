"""Smoke test for Outcome Ledger API"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:8090"
API_KEY = "test_smoke_key_12345"

results = []


def call(method, path, data=None, headers=None, expected_status=200):
    url = f"{BASE}{path}"
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        status = resp.status
        body_data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            body_data = json.loads(e.read())
        except Exception:
            body_data = {"error": str(e)}
    return status, body_data


def test(name, method, path, data=None, headers=None, expected_status=200):
    status, body = call(method, path, data=data, headers=headers)
    ok = status == expected_status
    mark = "PASS" if ok else "FAIL"
    results.append((name, ok, status, body))
    print(f"  [{mark}] {name}: HTTP {status}")
    if not ok:
        print(f"         Expected {expected_status}, got {status}")
        print(f"         Body: {json.dumps(body)[:300]}")
    return ok, body


if __name__ == "__main__":
    print("=" * 60)
    print("OUTCOME LEDGER — SMOKE TEST")
    print("=" * 60)

    # 1. Health
    print("\n[1] Health Check")
    ok, body = test("Health", "GET", "/health")
    if ok:
        print(f"      Service: {body.get('service')}")
        print(f"      Version: {body.get('version')}")
        print(f"      DB: {body.get('database', {}).get('dialect')}")
        print(f"      Tables: {body.get('database', {}).get('tables')}")

    # 2. Register tenant
    print("\n[2] Register Tenant")
    ok, body = test("Register", "POST", "/v1/tenants/register",
                    data={"name": "Smoke Test Corp", "companyName": "SmokeTest"})
    tenant_key = body.get("apiKey", "") if ok else ""
    tenant_id = body.get("orgId", "") if ok else ""
    if ok:
        print(f"      Tenant: {tenant_id}")
        print(f"      Key: {tenant_key[:20]}...")

    # 3. Tenant me
    print("\n[3] Tenant Info")
    ok, body = test("Tenant me", "GET", "/v1/tenants/me",
                    headers={"X-Api-Key": tenant_key})
    if ok:
        print(f"      Org: {body.get('name')}")

    # 4. Ingest usage
    print("\n[4] Ingest Usage")
    ok, body = test("Usage ingest", "POST", "/v1/ingest/usage",
                    headers={"X-Api-Key": tenant_key},
                    data={"events": [{
                        "external_id": "smoke-usage-1",
                        "source": "openai",
                        "cost_usd": 45.50,
                        "period_start": "2026-06-01T00:00:00Z",
                        "period_end": "2026-06-01T23:59:59Z",
                        "model": "gpt-4.1",
                        "input_tokens": 50000,
                        "output_tokens": 10000,
                    }]})
    if ok:
        print(f"      Inserted: {body.get('inserted', 0)}")

    # 5. Ingest outcome
    print("\n[5] Ingest Outcome")
    ok, body = test("Outcome ingest", "POST", "/v1/ingest/outcomes",
                    headers={"X-Api-Key": tenant_key},
                    data={"events": [{
                        "external_id": "smoke-outcome-1",
                        "source": "github",
                        "outcome_type": "pr_merged_stable",
                        "accepted": True,
                        "occurred_at": "2026-06-04T14:00:00Z",
                        "repo": "test/repo",
                        "pr_number": 123,
                        "author": "testuser",
                    }]})
    if ok:
        print(f"      Inserted: {body.get('inserted', 0)}")

    # 6. Ingest status
    print("\n[6] Ingest Status")
    ok, body = test("Ingest status", "GET", "/v1/ingest/status",
                    headers={"X-Api-Key": tenant_key})
    if ok:
        print(f"      Keys: {list(body.keys())}")

    # 7. Onboarding
    print("\n[7] Onboarding Status")
    ok, body = test("Onboarding", "GET", "/v1/onboarding/status",
                    headers={"X-Api-Key": tenant_key})
    if ok:
        print(f"      Steps: {len(body.get('steps', []))}")

    # 8. Metrics overview
    print("\n[8] Metrics Overview")
    ok, body = test("Metrics", "GET", "/v1/metrics/overview",
                    headers={"X-Api-Key": tenant_key})
    if ok:
        print(f"      CPST: {body.get('cpst', 'N/A')}")

    # 9. Waitlist stats
    print("\n[9] Waitlist Stats (public)")
    ok, body = test("Waitlist", "GET", "/v1/waitlist/stats")
    if ok:
        print(f"      Total: {body.get('total', 0)}")

    # 10. Sync complete
    print("\n[10] Sync Complete")
    ok, body = test("Sync complete", "POST", "/v1/ingest/sync-complete",
                    headers={"X-Api-Key": tenant_key},
                    data={"usage": {"inserted": 1}, "outcomes": {"inserted": 1}})
    if ok:
        print(f"      Run ID: {body.get('syncRunId', 'N/A')}")

    # Summary
    passed = sum(1 for _, ok, _, _ in results if ok)
    total = len(results)
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{total} passed")
    if passed == total:
        print("ALL TESTS PASSED")
    else:
        print(f"FAILED: {total - passed} tests")
        for name, ok, status, body in results:
            if not ok:
                print(f"  FAIL: {name} (HTTP {status})")
    print("=" * 60)

    sys.exit(0 if passed == total else 1)
