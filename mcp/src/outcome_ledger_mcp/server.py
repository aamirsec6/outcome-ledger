from __future__ import annotations

import asyncio
import json
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from outcome_ledger_mcp.sync import SyncManager

server = Server("outcome-ledger")


def _text(data: Any) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps(data, indent=2, default=str))]


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="outcome_ledger_sync",
            description="Fetch all configured AI usage and GitHub outcomes, push to Outcome Ledger cloud",
            inputSchema={
                "type": "object",
                "properties": {
                    "since": {"type": "string", "description": "Lookback e.g. 30d or 7d", "default": "90d"},
                    "source": {"type": "string", "description": "Optional single source id"},
                    "dry_run": {"type": "boolean", "default": False},
                },
            },
        ),
        Tool(
            name="outcome_ledger_test_connections",
            description="Test connectivity for each configured data source",
            inputSchema={
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                },
            },
        ),
        Tool(
            name="outcome_ledger_status",
            description="Local cache and cloud ingest status",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="outcome_ledger_list_sources",
            description="Which extractors are configured",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    mgr = SyncManager()
    args = arguments or {}
    if name == "outcome_ledger_sync":
        result = mgr.sync_all(
            since=args.get("since", "90d"),
            source=args.get("source"),
            dry_run=bool(args.get("dry_run", False)),
        )
        return _text(result)
    if name == "outcome_ledger_test_connections":
        return _text(mgr.test_connections(source=args.get("source")))
    if name == "outcome_ledger_status":
        return _text(mgr.status())
    if name == "outcome_ledger_list_sources":
        return _text(mgr.list_sources())
    raise ValueError(f"Unknown tool: {name}")


async def _main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def run_server() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    run_server()
