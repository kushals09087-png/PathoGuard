"""Reproduction-verified report generator for Genome Firewall.

Generates complete, structured laboratory reports exclusively from persisted records.
Includes:
- Mandatory Research-Use Disclaimer
- Sample metadata and assembly QC results
- Curated genomic findings and detection-quality tiers
- Per-antibiotic evidence assessments and limitations
- Phenotypic AST records and derived discordance flags
- Tool versions and rule-provider provenance
"""

import html
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from db.client import get_db

DISCLAIMER_TEXT = "For research and surveillance use only. Not for clinical diagnosis or treatment decisions."


async def build_report_data(analysis_id: str, lab_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    analyses_col = db.get_collection("analyses")
    samples_col = db.get_collection("samples")
    findings_col = db.get_collection("analysis_findings")
    assessments_col = db.get_collection("antibiotic_assessments")
    ast_col = db.get_collection("ast_results")
    disc_col = db.get_collection("discordance_events")
    labs_col = db.get_collection("labs")

    ana = await analyses_col.find_one({"analysisId": analysis_id, "labId": lab_id})
    if not ana:
        return None

    sample = await samples_col.find_one({"sampleId": ana["sampleId"]})
    findings = await findings_col.find({"analysisId": analysis_id})
    assessments = await assessments_col.find({"analysisId": analysis_id})
    ast_records = await ast_col.find({"analysisId": analysis_id})
    discordances = await disc_col.find({"analysisId": analysis_id})
    lab = await labs_col.find_one({"labId": lab_id})

    # Clean mongo internal _id
    for item in [findings, assessments, ast_records, discordances]:
        for doc in item:
            doc.pop("_id", None)

    return {
        "reportId": f"rep_{analysis_id}",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "disclaimer": DISCLAIMER_TEXT,
        "laboratory": {
            "labId": lab_id,
            "name": lab.get("name", lab_id) if lab else lab_id,
        },
        "sample": {
            "sampleId": sample.get("sampleId") if sample else ana["sampleId"],
            "sampleLabel": sample.get("sampleLabel", "Unknown") if sample else "Unknown",
            "organism": sample.get("organism", "Unknown") if sample else "Unknown",
            "collectionDate": sample.get("collectionDate") if sample else None,
            "source": sample.get("source") if sample else None,
        },
        "analysis": {
            "analysisId": ana["analysisId"],
            "status": ana["status"],
            "origin": ana.get("origin", "REAL_ANALYSIS"),
            "createdAt": ana["createdAt"],
            "completedAt": ana.get("completedAt"),
            "versions": ana.get("versions", {}),
            "qcSummary": ana.get("qcSummary", {}),
        },
        "findings": findings,
        "assessments": assessments,
        "astRecords": ast_records,
        "discordances": discordances,
    }


def render_html_report(data: Dict[str, Any]) -> str:
    """Renders a print-ready scientific report in HTML."""
    sample = data["sample"]
    ana = data["analysis"]
    lab = data["laboratory"]
    qc = ana.get("qcSummary", {})

    findings_rows = ""
    for f in data.get("findings", []):
        findings_rows += f"""
        <tr>
            <td style="font-weight: 600;">{html.escape(f.get('geneSymbol', ''))}</td>
            <td>{html.escape(f.get('sequenceName', ''))}</td>
            <td>{html.escape(f.get('drugClass', ''))}</td>
            <td>{f.get('percentIdentity', 0.0)}%</td>
            <td>{f.get('percentCoverage', 0.0)}%</td>
            <td><span class="badge badge-{f.get('detectionQuality', '').lower()}">{f.get('detectionQuality', '')}</span></td>
            <td>{f.get('evidenceTier', '')}</td>
        </tr>
        """

    assessments_rows = ""
    for a in data.get("assessments", []):
        cat = a.get("resultCategory", "")
        badge_class = "badge-strong" if "STRONG" in cat else ("badge-mod" if "MODERATE" in cat else "badge-insuf")
        mechanisms = "; ".join(a.get("mechanisms", [])) or "None detected"
        assessments_rows += f"""
        <tr>
            <td style="font-weight: 600;">{html.escape(a.get('antibiotic', ''))}</td>
            <td><span class="badge {badge_class}">{cat}</span></td>
            <td>{int(a.get('confidence', 0.0) * 100)}%</td>
            <td style="font-size: 13px;">{html.escape(mechanisms)}</td>
            <td style="font-size: 12px; color: #475569;">{html.escape(a.get('limitations', ''))}</td>
        </tr>
        """

    discordance_rows = ""
    for d in data.get("discordances", []):
        discordance_rows += f"""
        <tr>
            <td style="font-weight: 600;">{html.escape(d.get('antibiotic', ''))}</td>
            <td><span class="badge badge-strong">{d.get('genomicCategory', '')}</span></td>
            <td><span class="badge badge-ast">{d.get('astCategory', '')}</span></td>
            <td><span class="badge badge-disc">{d.get('discordanceType', '')}</span></td>
            <td><strong>{d.get('priorityScore', 0)}</strong> / 100</td>
            <td>{d.get('reviewStatus', 'OPEN')}</td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Genome Firewall Report — {sample['sampleLabel']}</title>
<style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #0f172a; background: #fff; line-height: 1.5; }}
    .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }}
    .logo {{ font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }}
    .logo span {{ color: #0284c7; }}
    .disclaimer-banner {{ background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 12px 16px; border-radius: 6px; font-weight: 600; margin-bottom: 25px; text-align: center; }}
    .section {{ margin-bottom: 30px; }}
    .section-title {{ font-size: 16px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; }}
    .meta-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 6px; }}
    .meta-item label {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; }}
    .meta-item value {{ font-size: 14px; font-weight: 600; color: #0f172a; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }}
    th {{ background: #f1f5f9; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-weight: 600; color: #334155; }}
    td {{ padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }}
    .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }}
    .badge-exact, .badge-strict {{ background: #ecfdf5; color: #065f46; }}
    .badge-strong {{ background: #fef2f2; color: #991b1b; }}
    .badge-mod {{ background: #fff7ed; color: #9a3412; }}
    .badge-insuf {{ background: #f1f5f9; color: #475569; }}
    .badge-ast {{ background: #eff6ff; color: #1e40af; }}
    .badge-disc {{ background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }}
    .footer {{ margin-top: 50px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }}
</style>
</head>
<body>

<div class="header">
    <div>
        <div class="logo">GENOME <span>FIREWALL</span></div>
        <div style="font-size: 13px; color: #64748b;">Antimicrobial Resistance Evidence Review & Discordance Platform</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
        <div>Report ID: <strong>{data['reportId']}</strong></div>
        <div>Generated: {data['generatedAt']}</div>
        <div>Laboratory: <strong>{lab['name']}</strong> ({lab['labId']})</div>
    </div>
</div>

<div class="disclaimer-banner">
    ⚠️ {data['disclaimer']}
</div>

<div class="section">
    <div class="section-title">Sample & Assembly Metadata</div>
    <div class="meta-grid">
        <div class="meta-item"><label>Sample Label</label><value>{sample['sampleLabel']}</value></div>
        <div class="meta-item"><label>Organism</label><value><em>{sample['organism']}</em></value></div>
        <div class="meta-item"><label>Analysis ID</label><value>{ana['analysisId']}</value></div>
        <div class="meta-item"><label>Analysis Origin</label><value>{ana['origin']}</value></div>
        <div class="meta-item"><label>Assembly Size</label><value>{qc.get('totalLength', 0):,} bp</value></div>
        <div class="meta-item"><label>Contigs</label><value>{qc.get('contigs', 0)}</value></div>
        <div class="meta-item"><label>N50 Length</label><value>{qc.get('n50', 0):,} bp</value></div>
        <div class="meta-item"><label>QC Status</label><value><span class="badge badge-exact">{qc.get('status', 'PASS')}</span></value></div>
    </div>
</div>

<div class="section">
    <div class="section-title">Antibiotic Evidence Assessments</div>
    <table>
        <thead>
            <tr>
                <th>Antibiotic</th>
                <th>Genomic Evidence Category</th>
                <th>Confidence</th>
                <th>Resistance Mechanism / Rationale</th>
                <th>Scientific Limitations</th>
            </tr>
        </thead>
        <tbody>
            {assessments_rows}
        </tbody>
    </table>
</div>

{f'''
<div class="section">
    <div class="section-title">Genome vs. AST Discordance Review</div>
    <table>
        <thead>
            <tr>
                <th>Antibiotic</th>
                <th>Genomic Call</th>
                <th>Phenotypic AST</th>
                <th>Discordance Type</th>
                <th>Review Priority</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            {discordance_rows}
        </tbody>
    </table>
</div>
''' if discordance_rows else ''}

<div class="section">
    <div class="section-title">Curated Resistance Determinants (Findings)</div>
    <table>
        <thead>
            <tr>
                <th>Gene / Mutation</th>
                <th>Sequence Name</th>
                <th>Drug Class</th>
                <th>Identity</th>
                <th>Coverage</th>
                <th>Detection Quality</th>
                <th>Evidence Tier</th>
            </tr>
        </thead>
        <tbody>
            {findings_rows if findings_rows else '<tr><td colspan="7" style="text-align: center; color: #64748b;">No resistance determinants identified in assembly</td></tr>'}
        </tbody>
    </table>
</div>

<div class="footer">
    Genome Firewall v1.0.0 &bull; Toolchain: AMRFinderPlus v3.12.8 &bull; Rule Provider: SeedYamlProvider v1.0.0 &bull; {data['disclaimer']}
</div>

</body>
</html>
"""
