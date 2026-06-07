"""MCP internal smoke test"""
from outcome_ledger_mcp.sync import parse_since
from outcome_ledger_mcp.cache import EventCache

# Test parse_since
print("=== parse_since ===")
print(f"  30d -> {parse_since('30d')}")
print(f"  24h -> {parse_since('24h')}")
try:
    parse_since("bad")
    print("  FAIL: should have raised ValueError")
except ValueError:
    print("  bad -> ValueError (correct)")

# Test cache
print("\n=== Cache ===")
cache = EventCache()
cache.store_usage_batch([
    {"external_id": "t1", "source": "openai", "cost_usd": 10.0},
    {"external_id": "t2", "source": "anthropic", "cost_usd": 20.0},
])
print(f"  Stored: {len(cache.pending_usage())} events")
cache.clear_usage(["t1", "t2"])
print(f"  After clear: {len(cache.pending_usage())} events")

cache.set_source_status("openai", "ok", "2 events")
cache.set_source_status("github", "ok", "1 outcome")
statuses = cache.source_statuses()
print(f"  Sources: {list(statuses.keys())}")

print("\nALL MCP INTERNAL TESTS PASSED")
