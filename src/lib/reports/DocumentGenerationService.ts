/**
 * DIP PDF Report Generator
 * Uses jsPDF + autoTable to produce a client-ready structured report.
 * AI Summary section is clearly labeled as non-scoring.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ScoringResult } from '@/lib/scoring/AssessmentScoringEngine'

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable: { finalY: number }
  internal: jsPDF['internal'] & { getNumberOfPages(): number }
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fullAnalysis?: Record<string, any>  // 5-dimensional AI analysis
}

export function generatePDFReport(data: ReportData): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPDFWithAutoTable
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
  // Header with gradient effect (approximated with layers)
  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, 210, 70, 'F')
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, 210, 3, 'F')
  
  // Brand logo placeholder (DIP in circle)
  doc.setFillColor(59, 130, 246)
  doc.circle(margin + 8, 22, 8, 'F')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('DIP', margin + 8, 24, { align: 'center' })
  
  // Title
  doc.setFontSize(24)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Decision Intelligence Report', margin + 24, 26)
  
  // Project name
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(147, 197, 253)
  doc.text(data.projectName, margin + 24, 36)
  
  // Metadata bar
  doc.setFontSize(9)
  doc.setTextColor(156, 163, 175)
  doc.text(`Generated ${data.reportDate}  |  Framework v${data.frameworkVersion}  |  ${data.responseCount} responses`, margin, 56)
  
  y = 82

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

  y = doc.lastAutoTable.finalY + 10

  // ─── Category Visual Chart ──────────────────────────────────
  checkPage(80)
  addSubtitle('Visual Comparison — Normalized Scores (0-100)')
  y += 4
  
  const chartWidth = 170
  const barHeight = 12
  const chartX = margin + 5
  
  data.scoring.categoryScores.forEach((cat, i) => {
    checkPage(20)
    
    // Category label
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    const labelText = cat.categoryName.length > 30 ? cat.categoryName.substring(0, 27) + '...' : cat.categoryName
    doc.text(labelText, chartX, y + 4)
    
    // Background bar
    doc.setFillColor(229, 231, 235)
    doc.roundedRect(chartX, y + 6, chartWidth, barHeight, 1.5, 1.5, 'F')
    
    // Score bar (gradient color based on score)
    const score = cat.normalizedScore
    const barWidth = (score / 100) * chartWidth
    let fillR = 0, fillG = 0, fillB = 0
    if (score >= 75) {
      fillR = 34; fillG = 197; fillB = 94  // Green
    } else if (score >= 50) {
      fillR = 234; fillG = 179; fillB = 8   // Yellow
    } else {
      fillR = 239; fillG = 68; fillB = 68   // Red
    }
    doc.setFillColor(fillR, fillG, fillB)
    doc.roundedRect(chartX, y + 6, barWidth, barHeight, 1.5, 1.5, 'F')
    
    // Score label
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(score.toFixed(1), chartX + chartWidth + 3, y + 13)
    
    y += barHeight + 8
  })
  
  y += 4
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

  y = doc.lastAutoTable.finalY + 10
  divider()

  // ─── AI Insights (clearly labeled) ──────────────────────────
  if (data.aiInsightSummary || (data.aiThemes && data.aiThemes.length > 0)) {
    checkPage(50)

    // Strip everything outside printable 7-bit ASCII — jsPDF Latin-1 codec
    // corrupts any multi-byte UTF-8 chars (bullets, em-dashes, curly quotes etc.)
    const sanitize = (s: string) =>
      s.replace(/[^\x20-\x7E]/g, ' ').replace(/\s{2,}/g, ' ').trim()

    // Explicitly reset font to normal BEFORE drawing anything in this section
    // (autoTable above may leave bold state that corrupts next text draw)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.setTextColor(91, 33, 182)
    doc.setFillColor(237, 233, 254)
    doc.rect(margin, y, 182, 11, 'F')
    doc.text('AI-Generated Insights', margin + 4, y + 7.5)
    y += 15

    // Disclaimer
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 53, 165)
    doc.text('Note: AI-generated content for reference only. Does not affect scoring.', margin, y)
    y += 8

    // Summary box
    if (data.aiInsightSummary) {
      const cleanSummary = sanitize(data.aiInsightSummary)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(55, 20, 100)

      const lines = doc.splitTextToSize(cleanSummary, 172) as string[]
      const lineH = 5.5
      const padTop = 6
      const padBot = 6
      const boxH = padTop + lines.length * lineH + padBot

      checkPage(boxH + 8)

      doc.setFillColor(250, 245, 255)
      doc.setDrawColor(196, 160, 250)
      doc.setLineWidth(0.4)
      doc.rect(margin, y, 182, boxH, 'FD')
      doc.setLineWidth(0.2)
      doc.setTextColor(55, 20, 100)

      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], margin + 5, y + padTop + i * lineH + 4)
      }

      y += boxH + 8
    }

    // Themes
    if (data.aiThemes && data.aiThemes.length > 0) {
      checkPage(20)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(91, 33, 182)
      doc.text('Key Themes:', margin, y)
      y += 7

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)

      for (const theme of data.aiThemes) {
        const cleanTheme = sanitize(theme)
        if (!cleanTheme) continue
        const tLines = doc.splitTextToSize('- ' + cleanTheme, 172) as string[]
        checkPage(tLines.length * 5.5 + 4)
        for (let i = 0; i < tLines.length; i++) {
          doc.text(tLines[i], margin + 3, y + i * 5.5)
        }
        y += tLines.length * 5.5 + 3
      }
      y += 2
    }

    divider([196, 160, 250])
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
  const pageCount = doc.internal.getNumberOfPages()
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
