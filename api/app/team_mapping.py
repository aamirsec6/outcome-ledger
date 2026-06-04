from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import TeamMapping


def resolve_team_for_repo(db: Session, org_id: str, repo: str) -> str:
    """Longest matching repo pattern wins; else org segment of repo."""
    mappings = (
        db.query(TeamMapping)
        .filter(TeamMapping.org_id == org_id)
        .order_by(TeamMapping.pattern.desc())
        .all()
    )
    for row in mappings:
        pat = row.pattern.strip()
        if not pat:
            continue
        if repo == pat or repo.startswith(pat.rstrip("/") + "/"):
            return row.team_id
    if "/" in repo:
        return repo.split("/")[0]
    return "unassigned"


def list_team_mappings(db: Session, org_id: str) -> list[dict]:
    rows = (
        db.query(TeamMapping)
        .filter(TeamMapping.org_id == org_id)
        .order_by(TeamMapping.pattern)
        .all()
    )
    return [{"pattern": r.pattern, "teamId": r.team_id} for r in rows]


def replace_team_mappings(db: Session, org_id: str, mappings: list[dict]) -> list[dict]:
    db.query(TeamMapping).filter(TeamMapping.org_id == org_id).delete()
    saved = []
    for item in mappings:
        pattern = str(item.get("pattern") or "").strip()
        team_id = str(item.get("teamId") or item.get("team_id") or "").strip()
        if not pattern or not team_id:
            continue
        db.add(TeamMapping(org_id=org_id, pattern=pattern, team_id=team_id))
        saved.append({"pattern": pattern, "teamId": team_id})
    db.flush()
    return saved
