"""
PDF Report Generator for NetraAI MCP Analytics
Generates professional PDF reports with charts, tables, and branding.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.lib.enums import TA_CENTER
from datetime import datetime
from typing import Dict, List
import io
import logging

logger = logging.getLogger(__name__)


class PDFReportGenerator:
    """
    Professional PDF report generator for MCP analytics and audit logs.

    Features:
    - Cover page with branding
    - Executive summary
    - Detailed analytics tables
    - Charts (as images)
    - Professional styling
    - Page numbers and headers
    """

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the report."""
        # Title style
        self.styles.add(
            ParagraphStyle(
                name="CustomTitle",
                parent=self.styles["Heading1"],
                fontSize=24,
                textColor=colors.HexColor("#0D9488"),
                spaceAfter=30,
                alignment=TA_CENTER,
                fontName="Helvetica-Bold",
            )
        )

        # Subtitle style
        self.styles.add(
            ParagraphStyle(
                name="CustomSubtitle",
                parent=self.styles["Heading2"],
                fontSize=16,
                textColor=colors.HexColor("#0F172A"),
                spaceAfter=12,
                spaceBefore=12,
                fontName="Helvetica-Bold",
            )
        )

        # Section header style
        self.styles.add(
            ParagraphStyle(
                name="SectionHeader",
                parent=self.styles["Heading3"],
                fontSize=14,
                textColor=colors.HexColor("#0D9488"),
                spaceAfter=10,
                spaceBefore=15,
                fontName="Helvetica-Bold",
            )
        )

    def generate_analytics_report(self, analytics_data: Dict) -> bytes:
        """
        Generate comprehensive analytics PDF report.

        Parameters:
        - analytics_data: Dictionary containing all analytics data

        Returns:
        - PDF file as bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        story = []

        # Cover Page
        story.extend(self._create_cover_page())
        story.append(PageBreak())

        # Executive Summary
        story.extend(self._create_executive_summary(analytics_data))
        story.append(Spacer(1, 0.3 * inch))

        # Usage Trends
        if "usage_trends" in analytics_data:
            story.extend(
                self._create_usage_trends_section(analytics_data["usage_trends"])
            )
            story.append(Spacer(1, 0.2 * inch))

        # Success Rates
        if "success_rates" in analytics_data:
            story.extend(
                self._create_success_rates_section(analytics_data["success_rates"])
            )
            story.append(Spacer(1, 0.2 * inch))

        # Latency Distribution
        if "latency_distribution" in analytics_data:
            story.extend(
                self._create_latency_section(analytics_data["latency_distribution"])
            )
            story.append(Spacer(1, 0.2 * inch))

        # Geographic Distribution
        if "geographic_distribution" in analytics_data:
            story.extend(
                self._create_geographic_section(
                    analytics_data["geographic_distribution"]
                )
            )

        # Build PDF
        doc.build(story)

        buffer.seek(0)
        return buffer.getvalue()

    def generate_audit_log_report(self, logs: List[Dict]) -> bytes:
        """
        Generate audit log PDF report.

        Parameters:
        - logs: List of audit log entries

        Returns:
        - PDF file as bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        story = []

        # Cover Page
        story.extend(self._create_audit_cover_page(len(logs)))
        story.append(PageBreak())

        # Audit Logs Table
        story.extend(self._create_audit_logs_table(logs))

        # Build PDF
        doc.build(story)

        buffer.seek(0)
        return buffer.getvalue()

    def _create_cover_page(self) -> List:
        """Create cover page for analytics report."""
        elements = []

        # Title
        elements.append(Spacer(1, 2 * inch))
        elements.append(
            Paragraph("NetraAI MCP Analytics Report", self.styles["CustomTitle"])
        )

        # Subtitle
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(
            Paragraph(
                "Comprehensive MCP Server Performance Analysis", self.styles["Normal"]
            )
        )

        # Date
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(
            Paragraph(
                f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
                self.styles["Normal"],
            )
        )

        # Footer
        elements.append(Spacer(1, 3 * inch))
        elements.append(
            Paragraph(
                "NetraAI - Transforming Healthcare Through AI-Powered Automation",
                ParagraphStyle(
                    name="Footer",
                    parent=self.styles["Normal"],
                    fontSize=10,
                    textColor=colors.grey,
                    alignment=TA_CENTER,
                ),
            )
        )

        return elements

    def _create_audit_cover_page(self, log_count: int) -> List:
        """Create cover page for audit log report."""
        elements = []

        # Title
        elements.append(Spacer(1, 2 * inch))
        elements.append(
            Paragraph("NetraAI Audit Log Report", self.styles["CustomTitle"])
        )

        # Subtitle
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(
            Paragraph(
                f"Complete Audit Trail - {log_count} Entries", self.styles["Normal"]
            )
        )

        # Date
        elements.append(Spacer(1, 0.5 * inch))
        elements.append(
            Paragraph(
                f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
                self.styles["Normal"],
            )
        )

        return elements

    def _create_executive_summary(self, analytics_data: Dict) -> List:
        """Create executive summary section."""
        elements = []

        elements.append(Paragraph("Executive Summary", self.styles["CustomSubtitle"]))

        # Key metrics
        summary_data = []

        if "usage_trends" in analytics_data:
            usage = analytics_data["usage_trends"]
            summary_data.append(
                ["Total Invocations (24h)", f"{usage.get('total_invocations', 0):,}"]
            )
            summary_data.append(["Peak Hour", usage.get("peak_hour", "N/A")])

        if "success_rates" in analytics_data:
            success = analytics_data["success_rates"]
            summary_data.append(
                [
                    "Overall Success Rate",
                    f"{(success.get('overall_success_rate', 0) * 100):.1f}%",
                ]
            )

        if "latency_distribution" in analytics_data:
            latency = analytics_data["latency_distribution"]
            percentiles = latency.get("percentiles", {})
            summary_data.append(
                ["Median Latency (P50)", f"{percentiles.get('p50', 0)}ms"]
            )

        # Create summary table
        summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
                ]
            )
        )

        elements.append(summary_table)

        return elements

    def _create_usage_trends_section(self, usage_data: Dict) -> List:
        """Create usage trends section."""
        elements = []

        elements.append(
            Paragraph("Usage Trends (24 Hours)", self.styles["SectionHeader"])
        )

        # Summary stats
        elements.append(
            Paragraph(
                f"Total Invocations: <b>{usage_data.get('total_invocations', 0):,}</b> | "
                f"Peak Hour: <b>{usage_data.get('peak_hour', 'N/A')}</b> | "
                f"Average per Hour: <b>{usage_data.get('avg_per_hour', 0):.1f}</b>",
                self.styles["Normal"],
            )
        )

        elements.append(Spacer(1, 0.2 * inch))

        # Hourly data table (show first 12 hours)
        data = usage_data.get("data", [])[:12]
        table_data = [["Hour", "Total", "Anemia", "Cataract", "DR", "Mental Health"]]

        for hour_data in data:
            table_data.append(
                [
                    hour_data.get("hour", ""),
                    str(hour_data.get("total_invocations", 0)),
                    str(hour_data.get("anemia", 0)),
                    str(hour_data.get("cataract", 0)),
                    str(hour_data.get("dr", 0)),
                    str(hour_data.get("mental_health", 0)),
                ]
            )

        usage_table = Table(table_data, colWidths=[0.8 * inch] * 6)
        usage_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D9488")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                ]
            )
        )

        elements.append(usage_table)

        return elements

    def _create_success_rates_section(self, success_data: Dict) -> List:
        """Create success rates section."""
        elements = []

        elements.append(
            Paragraph("Success Rates by Tool", self.styles["SectionHeader"])
        )

        # Overall success rate
        elements.append(
            Paragraph(
                f"Overall Success Rate: <b>{(success_data.get('overall_success_rate', 0) * 100):.1f}%</b> | "
                f"Total Calls: <b>{success_data.get('total_calls', 0):,}</b> | "
                f"Successful: <b>{success_data.get('total_successful', 0):,}</b>",
                self.styles["Normal"],
            )
        )

        elements.append(Spacer(1, 0.2 * inch))

        # Tools table (top 10)
        tools = success_data.get("tools", [])[:10]
        table_data = [
            ["Tool", "Category", "Success Rate", "Total Calls", "Avg Latency"]
        ]

        for tool in tools:
            table_data.append(
                [
                    tool.get("tool", "").replace("_tool", "").replace("_", " ")[:20],
                    tool.get("category", ""),
                    f"{(tool.get('success_rate', 0) * 100):.1f}%",
                    f"{tool.get('total_calls', 0):,}",
                    f"{tool.get('avg_latency_ms', 0):.0f}ms",
                ]
            )

        success_table = Table(
            table_data, colWidths=[1.5 * inch, 1 * inch, 1 * inch, 1 * inch, 1 * inch]
        )
        success_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D9488")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                ]
            )
        )

        elements.append(success_table)

        return elements

    def _create_latency_section(self, latency_data: Dict) -> List:
        """Create latency distribution section."""
        elements = []

        elements.append(Paragraph("Latency Distribution", self.styles["SectionHeader"]))

        # Percentiles
        percentiles = latency_data.get("percentiles", {})
        elements.append(
            Paragraph(
                f"P50: <b>{percentiles.get('p50', 0)}ms</b> | "
                f"P75: <b>{percentiles.get('p75', 0)}ms</b> | "
                f"P90: <b>{percentiles.get('p90', 0)}ms</b> | "
                f"P95: <b>{percentiles.get('p95', 0)}ms</b> | "
                f"P99: <b>{percentiles.get('p99', 0)}ms</b>",
                self.styles["Normal"],
            )
        )

        elements.append(Spacer(1, 0.2 * inch))

        # Buckets table
        buckets = latency_data.get("buckets", [])
        table_data = [["Latency Range", "Request Count", "Percentage"]]

        for bucket in buckets:
            table_data.append(
                [
                    bucket.get("range", ""),
                    f"{bucket.get('count', 0):,}",
                    f"{bucket.get('percentage', 0):.1f}%",
                ]
            )

        latency_table = Table(table_data, colWidths=[2 * inch, 2 * inch, 2 * inch])
        latency_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D9488")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )

        elements.append(latency_table)

        return elements

    def _create_geographic_section(self, geo_data: Dict) -> List:
        """Create geographic distribution section."""
        elements = []

        elements.append(
            Paragraph("Geographic Distribution", self.styles["SectionHeader"])
        )

        # Regions table
        regions = geo_data.get("regions", [])
        table_data = [["Region", "Requests", "Percentage", "Avg Latency"]]

        for region in regions:
            table_data.append(
                [
                    region.get("region", ""),
                    f"{region.get('requests', 0):,}",
                    f"{region.get('percentage', 0):.1f}%",
                    f"{region.get('avg_latency_ms', 0):.0f}ms",
                ]
            )

        geo_table = Table(
            table_data, colWidths=[1.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch]
        )
        geo_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D9488")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )

        elements.append(geo_table)

        return elements

    def _create_audit_logs_table(self, logs: List[Dict]) -> List:
        """Create audit logs table."""
        elements = []

        elements.append(Paragraph("Audit Log Entries", self.styles["CustomSubtitle"]))

        # Logs table (limit to 100 entries for PDF size)
        table_data = [["Timestamp", "Tool", "Status", "Patient ID", "Latency"]]

        for log in logs[:100]:
            timestamp = log.get("timestamp", "")
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
                except (ValueError, AttributeError):
                    pass

            table_data.append(
                [
                    timestamp[:19],  # Truncate timestamp
                    log.get("tool_name", "")
                    .replace("_tool", "")
                    .replace("_", " ")[:20],
                    log.get("status", ""),
                    log.get("patient_id", ""),
                    f"{log.get('latency_ms', 0):.0f}ms",
                ]
            )

        audit_table = Table(
            table_data,
            colWidths=[1.5 * inch, 1.5 * inch, 0.8 * inch, 1 * inch, 0.8 * inch],
        )
        audit_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D9488")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("FONTSIZE", (0, 1), (-1, -1), 7),
                ]
            )
        )

        elements.append(audit_table)

        if len(logs) > 100:
            elements.append(Spacer(1, 0.2 * inch))
            elements.append(
                Paragraph(
                    f"<i>Note: Showing first 100 of {len(logs)} total entries. "
                    f"Export to Excel for complete data.</i>",
                    self.styles["Normal"],
                )
            )

        return elements
