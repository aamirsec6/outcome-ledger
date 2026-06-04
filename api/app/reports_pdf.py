from __future__ import annotations

import os
from io import BytesIO

from sqlalchemy.orm import Session

from app.executive_reports import STATUS_APPROVED, get_report_for_export
from app.metrics import build_overview
from app.org_profile import org_profile_payload, profile_meta_lines, profile_subtitle
from app.outcome_contracts import active_contract_payload, ensure_default_contract


def _fpdf_base():
    try:
        from fpdf import FPDF
    except ImportError as exc:
        raise RuntimeError(
            "PDF export requires fpdf2 (pip install fpdf2)"
        ) from exc
    return FPDF


def _pdf_safe(text: str) -> str:
    """Helvetica core fonts are latin-1 only."""
    text = (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2265", ">=")
        .replace("\u2264", "<=")
        .replace("\u00d7", "x")
    )
    return text.encode("latin-1", errors="replace").decode("latin-1")


class _BoardPdf(_fpdf_base()):
    org_profile: dict = {}
    period_label: str = ""

    def header(self):
        profile = self.org_profile or {}
        company = _pdf_safe(profile.get("companyName", "Organization"))
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 9, company, new_x="LMARGIN", new_y="NEXT")

        subtitle = profile_subtitle(profile)
        if subtitle:
            self.set_font("Helvetica", "", 10)
            self.set_text_color(60, 60, 60)
            self.cell(0, 6, _pdf_safe(subtitle), new_x="LMARGIN", new_y="NEXT")

        for line in profile_meta_lines(profile, self.period_label):
            self.set_font("Helvetica", "", 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 5, _pdf_safe(line), new_x="LMARGIN", new_y="NEXT")

        self.set_text_color(0, 0, 0)
        self.ln(2)
        self.set_draw_color(180, 180, 180)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

        self.set_font("Helvetica", "B", 12)
        self.cell(0, 7, "CPST Board Pack", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(100, 100, 100)
        self.cell(
            0,
            5,
            "Outcome Ledger · cost per successful outcome · deterministic metrics",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        self.set_text_color(0, 0, 0)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def export_cpst_pdf(
    db: Session,
    org_id: str,
    *,
    lookback_days: int = 90,
    require_approved: bool = True,
) -> bytes:
    ensure_default_contract(db, org_id)
    overview = build_overview(db, org_id, lookback_days=lookback_days)
    profile = org_profile_payload(db, org_id)
    contract = active_contract_payload(db, org_id) or {}
    report = get_report_for_export(db, org_id)

    if require_approved and (not report or report.status != STATUS_APPROVED):
        raise ValueError(
            "Generate and approve the executive narrative before PDF export"
        )

    pdf = _BoardPdf()
    pdf.org_profile = profile
    pdf.period_label = overview.get("periodLabel", "")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    is_draft = report is None or report.status != STATUS_APPROVED
    if is_draft:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(180, 100, 0)
        pdf.cell(0, 8, "DRAFT - narrative not approved for board distribution", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Metrics summary", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    rows = [
        ("Period", overview.get("periodLabel", "")),
        ("Metric version", f"CPST v{overview.get('metricVersion', '1.0')}"),
        ("Total AI spend (USD)", f"${overview.get('totalSpendUsd', 0):,.2f}"),
        ("Stable outcomes", str(overview.get("stableOutcomes", 0))),
        ("Pending outcomes", str(overview.get("pendingOutcomes", 0))),
        ("Reverted outcomes", str(overview.get("revertedOutcomes", 0))),
        ("Organization CPST (USD)", f"${overview.get('orgCpstUsd', 0):,.2f}"),
        ("Attributed spend %", f"{overview.get('attributedSpendPct', 0)}%"),
        ("Failure cost share %", f"{overview.get('failureCostShare', 0)}%"),
        ("Stable window (days)", os.getenv("OUTCOME_STABLE_DAYS", "7")),
    ]
    if contract:
        rows.extend(
            [
                ("Outcome contract", f"v{contract.get('version', '')} ({contract.get('status', '')})"),
                ("CFO approved", "Yes" if contract.get("cfoApproved") else "No"),
            ]
        )
    for label, val in rows:
        pdf.cell(70, 7, _pdf_safe(f"{label}:"), border=0)
        pdf.cell(0, 7, _pdf_safe(str(val)), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Teams", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(45, 7, "Team", border=1)
    pdf.cell(35, 7, "Spend USD", border=1)
    pdf.cell(30, 7, "Outcomes", border=1)
    pdf.cell(35, 7, "CPST USD", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    for team in overview.get("teams") or []:
        pdf.cell(45, 7, str(team.get("teamName", team.get("teamId", "")))[:28], border=1)
        pdf.cell(35, 7, f"{team.get('spendUsd', 0):,.2f}", border=1)
        pdf.cell(30, 7, str(team.get("acceptedOutcomes", 0)), border=1)
        pdf.cell(35, 7, f"{team.get('cpstUsd', 0):,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")

    if report and report.narrative:
        pdf.ln(6)
        pdf.set_font("Helvetica", "B", 11)
        title = "Executive narrative"
        if report.status == STATUS_APPROVED:
            title += f" (approved by {report.approved_by or 'reviewer'})"
        pdf.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        for para in report.narrative.split("\n"):
            pdf.multi_cell(0, 5, _pdf_safe(para.strip() or " "))
            pdf.ln(1)

    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Methodology appendix", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    appendix = [
        "CPST = fully loaded AI spend in period ÷ count of stable accepted outcomes.",
        "Stable outcome: per active outcome contract (default: merged PR, no revert within stability window).",
        "Numerator includes spend on failed/abandoned work; denominator counts only accepted outcomes.",
        "Attributed spend: usage events tagged to a team (not unassigned). Target >=80% for board use.",
        f"Formula version: {overview.get('metricVersion', '1.0')}. Reproducible from Outcome Ledger metrics store.",
    ]
    for line in appendix:
        pdf.multi_cell(0, 5, line)
        pdf.ln(1)

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
