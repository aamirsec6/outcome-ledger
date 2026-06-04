from __future__ import annotations

import json
import sys

import typer

from outcome_ledger_mcp import __version__
from outcome_ledger_mcp.config import AppConfig, CONFIG_PATH
from outcome_ledger_mcp.sync import SyncManager

app = typer.Typer(
    name="outcome-ledger-mcp",
    help="Fetch AI usage + GitHub outcomes and sync to Outcome Ledger",
)


@app.command()
def configure(
    outcome_ledger_url: str = typer.Option(None, "--outcome-ledger-url"),
    outcome_ledger_key: str = typer.Option(None, "--outcome-ledger-key"),
    openai_api_key: str = typer.Option(None, "--openai-key"),
    openai_org_id: str = typer.Option(None, "--openai-org-id"),
    openai_project_id: str = typer.Option(None, "--openai-project-id"),
    anthropic_api_key: str = typer.Option(None, "--anthropic-key"),
    github_token: str = typer.Option(None, "--github-token"),
    github_repos: str = typer.Option(None, "--github-repos", help="Comma-separated owner/repo"),
):
    cfg = AppConfig.load()
    if outcome_ledger_url:
        cfg.outcome_ledger_url = outcome_ledger_url.rstrip("/")
    if outcome_ledger_key:
        cfg.outcome_ledger_key = outcome_ledger_key
    if openai_api_key:
        cfg.openai_api_key = openai_api_key
    if openai_org_id:
        cfg.openai_org_id = openai_org_id
    if openai_project_id:
        cfg.openai_project_id = openai_project_id
    if anthropic_api_key:
        cfg.anthropic_api_key = anthropic_api_key
    if github_token:
        cfg.github_token = github_token
    if github_repos:
        cfg.github_repos = [r.strip() for r in github_repos.split(",") if r.strip()]
    cfg.save()
    typer.echo(f"Saved config to {CONFIG_PATH}")


@app.command()
def sync(
    since: str = typer.Option("90d", "--since"),
    source: str = typer.Option(None, "--source"),
    dry_run: bool = typer.Option(False, "--dry-run"),
    verbose: bool = typer.Option(False, "--verbose"),
):
    mgr = SyncManager()
    if verbose:
        from outcome_ledger_mcp.utils.logger import setup_logging
        setup_logging(verbose=True)
    try:
        result = mgr.sync_all(since=since, source=source, dry_run=dry_run)
        typer.echo(json.dumps(result, indent=2, default=str))
        if not result.get("ok"):
            raise typer.Exit(4)
    except ValueError as exc:
        typer.echo(str(exc), err=True)
        raise typer.Exit(2) from exc
    except Exception as exc:
        typer.echo(str(exc), err=True)
        raise typer.Exit(4) from exc


@app.command()
def status(verbose: bool = typer.Option(False, "--verbose")):
    mgr = SyncManager()
    typer.echo(json.dumps(mgr.status(), indent=2, default=str))


@app.command()
def test(source: str = typer.Option(None, "--source")):
    mgr = SyncManager()
    typer.echo(json.dumps(mgr.test_connections(source=source), indent=2))


@app.command("list-sources")
def list_sources():
    mgr = SyncManager()
    typer.echo(json.dumps(mgr.list_sources(), indent=2))


@app.command()
def reset(confirm: bool = typer.Option(False, "--confirm")):
    if not confirm:
        typer.echo("Pass --confirm to clear local cache", err=True)
        raise typer.Exit(5)
    from outcome_ledger_mcp.cache import EventCache
    EventCache().reset()
    typer.echo("Cache cleared")


@app.command()
def serve():
    """Start MCP stdio server for Cursor / Claude Desktop."""
    from outcome_ledger_mcp.server import run_server
    run_server()


@app.command()
def version():
    typer.echo(__version__)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
