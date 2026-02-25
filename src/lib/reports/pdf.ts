/**
 * DIP PDF Report Generator
 * Uses jsPDF + autoTable to produce a client-ready structured report.
 * AI Summary section is clearly labeled as non-scoring.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ScoringResult } from '@/lib/scoring/engine'

export interface ReportData {
  projectName: string
  industry: string | null
  goal: string | null
  reportDate: string
  frameworkVersion: string
  responseCount: number
  scoring: ScoringResult
  aiInsightSummary?: string   // Optional, clearly labeled as AI
  aiThemes?: string[]         // Optional AI themes
}

export function generatePDFReport(data: ReportData): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  let y = 20

  // ─── Helpers ────────────────────────────────────────────────
  const addTitle = (text: string, size = 16, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += size * 0.5 + 6
  }

  const addSubtitle = (text: string) => {
    doc.setFontSize(10)
    doc.setTextColor(90, 90, 90)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, 182)
    doc.text(lines, margin, y)
    y += lines.length * 6 + 1
  }

  const addBody = (text: string) => {
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, 180)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 2
  }

  const divider = (color: [number, number, number] = [220, 220, 220]) => {
    doc.setDrawColor(...color)
    doc.line(margin, y, 196, y)
    y += 8
  }

  const checkPage = (needed = 20) => {
    if (y + needed > 275) {
      doc.addPage()
      y = 20
    }
  }

  const scoreBar = (label: string, score: number, higherIsBetter = true) => {
    checkPage(16)
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    doc.text(label, margin, y)
    doc.text(`${score.toFixed(1)} / 100`, 196, y, { align: 'right' })

    // Bar background
    doc.setFillColor(230, 230, 230)
    doc.roundedRect(margin, y + 2, 150, 4, 1, 1, 'F')

    // Bar fill color based on score
    const pct = score / 100
    let r = 0, g = 0, b = 0
    if (!higherIsBetter) {
      // Risk: red = bad (high), green = good (low)
      r = Math.round(255 * pct)
      g = Math.round(200 * (1 - pct))
    } else {
      r = Math.round(255 * (1 - pct))
      g = Math.round(180 * pct)
    }
    doc.setFillColor(r, g, b)
    doc.roundedRect(margin, y + 2, 150 * pct, 4, 1, 1, 'F')
    y += 13
  }

  // ─── Cover Page ─────────────────────────────────────────────
  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, 210, 60, 'F')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Decision Intelligence Report', margin, 28)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(data.projectName, margin, 38)
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 180)
  doc.text(`Generated: ${data.reportDate}  |  Framework v${data.frameworkVersion}  |  n=${data.responseCount} responses`, margin, 48)
  y = 72

  if (data.industry) addSubtitle(`Industry: ${data.industry}`)
  if (data.goal) addSubtitle(`Project Goal: ${data.goal}`)
  y += 6
  divider()

  // ─── Executive Health Score ──────────────────────────────────
  checkPage(50)
  addTitle('Executive Health Score', 14, [17, 24, 39])
  y += 2

  const hs = data.scoring.healthScore
  const hsColor: [number, number, number] =
    hs >= 75 ? [22, 163, 74] :
    hs >= 50 ? [234, 179, 8] :
    [220, 38, 38]

  doc.setFontSize(48)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...hsColor)
  const scoreText = `${hs.toFixed(1)}`
  doc.text(scoreText, margin, y)
  const scoreTextWidth = doc.getTextWidth(scoreText)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text('/ 100', margin + scoreTextWidth + 4, y - 6)
  y += 20

  const hsLabel = hs >= 75 ? 'Healthy' : hs >= 50 ? 'Needs Attention' : 'At Risk'
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(`Status: ${hsLabel}  |  ${data.scoring.responseCount} respondents`, margin, y)
  y += 8
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 160)
  doc.text('Formula: Trust×25% + Usability×25% + (100−ConvRisk)×20% + Experience×20% + Loyalty×10%', margin, y)
  y += 10
  divider()

  // ─── Index Scores ────────────────────────────────────────────
  checkPage(60)
  addTitle('Performance Indexes', 12, [17, 24, 39])
  for (const idx of data.scoring.indexScores) {
    scoreBar(idx.label, idx.score0100, idx.higherIsBetter)
  }
  y += 8
  divider()

  // ─── Category Breakdown ──────────────────────────────────────
  checkPage(40)
  addTitle('Category Breakdown', 12, [17, 24, 39])

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Raw Score', 'Min Possible', 'Max Possible', 'Normalized (0–100)']],
    body: data.scoring.categoryScores.map(cs => [
      cs.categoryName,
      cs.rawScore.toFixed(2),
      cs.minPossible.toFixed(2),
      cs.maxPossible.toFixed(2),
      cs.normalizedScore.toFixed(2),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [17, 24, 39], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 10
  divider()

  // ─── Top Ranked Issues ───────────────────────────────────────
  checkPage(50)
  addTitle('Ranked Issues — Priority View', 12, [17, 24, 39])
  addSubtitle('Priority = 0.4×Risk + 0.4×Friction + 0.2×Frequency  |  Higher = More Critical')
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['#', 'Driver', 'Risk (%)', 'Friction (%)', 'Frequency (%)', 'Priority Score']],
    body: data.scoring.issueRankings.slice(0, 10).map((ir, i) => [
      String(i + 1),
      ir.driverTag.replace(/_/g, ' ').toUpperCase(),
      ir.risk.toFixed(1),
      ir.friction.toFixed(1),
      ir.frequency.toFixed(1),
      ir.priorityScore.toFixed(2),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255 },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      5: { fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 10
  divider()

  // ─── AI Insights (clearly labeled) ──────────────────────────
  if (data.aiInsightSummary || (data.aiThemes && data.aiThemes.length > 0)) {
    checkPage(40)
    addTitle('AI Summary (Non-Scoring)', 12, [91, 33, 182])
    addSubtitle('⚠ This section is an AI-generated summary and does NOT affect any scores.')
    y += 2

    if (data.aiInsightSummary) {
      doc.setDrawColor(91, 33, 182)
      doc.setFillColor(245, 243, 255)
      const lines = doc.splitTextToSize(data.aiInsightSummary, 178)
      const boxH = lines.length * 5 + 8
      doc.roundedRect(margin, y, 182, boxH, 2, 2, 'FD')
      doc.setFontSize(9)
      doc.setTextColor(60, 20, 120)
      doc.text(lines, margin + 3, y + 6)
      y += boxH + 4
    }

    if (data.aiThemes && data.aiThemes.length > 0) {
      addSubtitle('Key Themes')
      for (const theme of data.aiThemes) {
        addBody(`• ${theme}`)
      }
    }
    divider([196, 181, 253])
  }

  // ─── Recommended Next Actions ────────────────────────────────
  checkPage(50)
  addTitle('Recommended Next Actions', 12, [17, 24, 39])

  const topIssues = data.scoring.issueRankings.slice(0, 3)
  for (let i = 0; i < topIssues.length; i++) {
    const issue = topIssues[i]
    checkPage(20)
    addBody(
      `${i + 1}. Address "${issue.driverTag.replace(/_/g, ' ')}" — Priority Score: ${issue.priorityScore.toFixed(2)}. ` +
      `Risk: ${issue.risk.toFixed(1)}%, Friction: ${issue.friction.toFixed(1)}%.\n` +
      `   Recommended: Investigate root cause, run targeted UX review, A/B test improvements.`
    )
  }

  y += 4
  divider()

  // ─── Audit Trail ─────────────────────────────────────────────
  checkPage(30)
  addTitle('Scoring Audit Trail', 10, [100, 100, 100])
  addSubtitle(`Score Run ID: ${data.scoring.scoreRunId}`)
  addSubtitle(`Checksum (SHA-256): ${data.scoring.checksum}`)
  addSubtitle(`Framework Version: ${data.scoring.frameworkVersion}`)
  addSubtitle(`Executed: ${data.scoring.executedAt.toISOString()}`)
  addSubtitle(`Responses Scored: ${data.scoring.responseCount}`)

  // ─── Footer on each page ─────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.text(
      `Decision Intelligence Platform  |  ${data.projectName}  |  Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      290,
      { align: 'center' }
    )
  }

  return doc.output('blob')
}
