import io
import csv
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportService:
    @staticmethod
    def generate_csv_report(devices: List[Dict[str, Any]]) -> str:
        """
        Generates a flat CSV maintenance report for all devices.
        Returns:
            String payload containing the CSV.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            "Device ID", "Name", "Location", "Type", 
            "Status", "Health Score (%)", "Failure Probability (%)", "RUL (Days)"
        ])
        
        # Write rows
        for d in devices:
            writer.writerow([
                d.get("id"),
                d.get("name"),
                d.get("location"),
                d.get("type"),
                d.get("status"),
                d.get("health"),
                d.get("failure_prob"),
                d.get("rul")
            ])
            
        return output.getvalue()

    @staticmethod
    def generate_pdf_report(
        devices: List[Dict[str, Any]], 
        alerts: List[Dict[str, Any]],
        executive_summary: str = ""
    ) -> bytes:
        """
        Generates a professional executive PDF maintenance report using ReportLab.
        Returns:
            Binary bytes payload containing the PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Define clean professional styles
        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#1E3A8A"), # Dark navy blue
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            name="SubtitleStyle",
            parent=styles["Normal"],
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#4B5563"), # Slate grey
            spaceAfter=20
        )
        
        h2_style = ParagraphStyle(
            name="H2Style",
            parent=styles["Heading2"],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#1F2937"),
            spaceBefore=15,
            spaceAfter=8,
            keepWithNext=True
        )
        
        body_style = ParagraphStyle(
            name="BodyStyle",
            parent=styles["BodyText"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#374151")
        )

        table_header_style = ParagraphStyle(
            name="TableHeader",
            parent=styles["Normal"],
            fontSize=9,
            leading=11,
            textColor=colors.white,
            fontName="Helvetica-Bold"
        )

        table_cell_style = ParagraphStyle(
            name="TableCell",
            parent=styles["Normal"],
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#1F2937")
        )

        # 1. Report Header
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        story.append(Paragraph("Predictive Maintenance Hub", title_style))
        story.append(Paragraph(f"Fleet Health Executive Report · Generated on {timestamp_str}", subtitle_style))
        story.append(Spacer(1, 10))
        
        # 2. Executive Summary Metrics Cards
        total_devices = len(devices)
        healthy_devices = sum(1 for d in devices if d.get("status") == "healthy")
        critical_devices = sum(1 for d in devices if d.get("status") == "critical")
        avg_health = int(sum(d.get("health", 100) for d in devices) / total_devices) if total_devices > 0 else 100
        
        summary_text = (
            f"This executive summary outlines the operational status of the monitored fleet of <b>{total_devices} assets</b>. "
            f"Currently, <b>{healthy_devices}</b> machines are operating inside nominal parameters, while "
            f"<b>{critical_devices}</b> machines require immediate maintenance attention. The overall average fleet health index is "
            f"sitting at <b>{avg_health}%</b>. "
        )
        
        if executive_summary:
            summary_text += f"<br/><br/>{executive_summary}"
            
        story.append(Paragraph("Executive Summary", h2_style))
        story.append(Paragraph(summary_text, body_style))
        story.append(Spacer(1, 15))
        
        # 3. Fleet Health Table
        story.append(Paragraph("Asset Inventory & Status Overview", h2_style))
        
        # Table data setup
        table_data = [
            [
                Paragraph("Asset ID", table_header_style), 
                Paragraph("Name", table_header_style), 
                Paragraph("Location", table_header_style), 
                Paragraph("Health", table_header_style), 
                Paragraph("Status", table_header_style),
                Paragraph("RUL (Days)", table_header_style)
            ]
        ]
        
        for d in devices:
            status_text = d.get("status", "healthy").upper()
            table_data.append([
                Paragraph(str(d.get("id")), table_cell_style),
                Paragraph(str(d.get("name")), table_cell_style),
                Paragraph(str(d.get("location")), table_cell_style),
                Paragraph(f"{d.get('health')}%", table_cell_style),
                Paragraph(status_text, table_cell_style),
                Paragraph(f"{d.get('rul')} days", table_cell_style)
            ])
            
        t = Table(table_data, colWidths=[65, 110, 160, 55, 75, 75])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E3A8A")),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F9FAFB")]),
            ('BOTTOMPADDING', (0,1), (-1,-1), 5),
            ('TOPPADDING', (0,1), (-1,-1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 15))
        
        # 4. Critical Active Alerts Table
        if alerts:
            story.append(Paragraph("Active High-Priority Alerts", h2_style))
            alert_headers = [
                [
                    Paragraph("Device", table_header_style), 
                    Paragraph("Severity", table_header_style), 
                    Paragraph("Message", table_header_style), 
                    Paragraph("Timestamp", table_header_style)
                ]
            ]
            
            for a in alerts[:8]:  # limit to top 8 active alerts for page budget
                alert_headers.append([
                    Paragraph(str(a.get("device_id") or a.get("device", "N/A")), table_cell_style),
                    Paragraph(str(a.get("severity", "Warning")).upper(), table_cell_style),
                    Paragraph(str(a.get("message")), table_cell_style),
                    Paragraph(str(a.get("recorded_at") or a.get("time")), table_cell_style)
                ])
                
            at = Table(alert_headers, colWidths=[110, 65, 245, 120])
            at.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#B91C1C")), # Red for alerts
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('BOTTOMPADDING', (0,0), (-1,0), 6),
                ('TOPPADDING', (0,0), (-1,0), 6),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F3F4F6")),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#FEF2F2")]),
                ('BOTTOMPADDING', (0,1), (-1,-1), 5),
                ('TOPPADDING', (0,1), (-1,-1), 5),
            ]))
            story.append(at)
            
        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        return pdf_data
