from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

CONFIG_DIR = Path(os.getenv("OUTCOME_LEDGER_CONFIG_DIR", Path.home() / ".outcome-ledger"))
CONFIG_PATH = CONFIG_DIR / "config.json"


class AppConfig:
    def __init__(self, data: dict[str, Any] | None = None):
        raw = data or {}
        self.outcome_ledger_url: str = (
            raw.get("outcome_ledger_url")
            or os.getenv("OUTCOME_LEDGER_URL", "http://127.0.0.1:8000")
        ).rstrip("/")
        self.outcome_ledger_key: str = (
            raw.get("outcome_ledger_key") or os.getenv("OUTCOME_LEDGER_KEY", "")
        ).strip()
        self.openai_api_key: str = (raw.get("openai_api_key") or os.getenv("OPENAI_API_KEY", "")).strip()
        self.openai_org_id: str = (raw.get("openai_org_id") or os.getenv("OPENAI_ORG_ID", "")).strip()
        self.openai_project_id: str = (
            raw.get("openai_project_id") or os.getenv("OPENAI_PROJECT_ID", "")
        ).strip()
        self.anthropic_api_key: str = (
            raw.get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY", "")
        ).strip()
        self.github_token: str = (raw.get("github_token") or os.getenv("GITHUB_TOKEN", "")).strip()
        repos = raw.get("github_repos") or os.getenv("GITHUB_REPOS", "")
        if isinstance(repos, list):
            self.github_repos: list[str] = [str(r).strip() for r in repos if str(r).strip()]
        else:
            self.github_repos = [r.strip() for r in str(repos).split(",") if r.strip()]
        watch = raw.get("watch_paths") or []
        if isinstance(watch, list):
            self.watch_paths = [str(p) for p in watch]
        else:
            self.watch_paths = []
        if not self.watch_paths:
            self.watch_paths = [
                str(Path.home() / "Downloads"),
                str(CONFIG_DIR / "imports"),
            ]
        self.sync_interval_hours: int = int(raw.get("sync_interval_hours") or 24)

    def to_dict(self) -> dict[str, Any]:
        return {
            "outcome_ledger_url": self.outcome_ledger_url,
            "outcome_ledger_key": self.outcome_ledger_key,
            "openai_api_key": self.openai_api_key,
            "openai_org_id": self.openai_org_id,
            "openai_project_id": self.openai_project_id,
            "anthropic_api_key": self.anthropic_api_key,
            "github_token": self.github_token,
            "github_repos": self.github_repos,
            "watch_paths": self.watch_paths,
            "sync_interval_hours": self.sync_interval_hours,
        }

    def save(self) -> None:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        CONFIG_PATH.write_text(json.dumps(self.to_dict(), indent=2))
        try:
            CONFIG_PATH.chmod(0o600)
        except OSError:
            pass

    @classmethod
    def load(cls) -> AppConfig:
        if CONFIG_PATH.exists():
            return cls(json.loads(CONFIG_PATH.read_text()))
        return cls()

    def configured_sources(self) -> dict[str, bool]:
        return {
            "outcome_ledger": bool(self.outcome_ledger_key),
            "openai": bool(self.openai_api_key),
            "anthropic": bool(self.anthropic_api_key),
            "github": bool(self.github_token and self.github_repos),
            "cursor": bool(self.watch_paths),
            "claude_code": bool(self.watch_paths or self.anthropic_api_key),
            "copilot": bool(self.github_token),
        }
