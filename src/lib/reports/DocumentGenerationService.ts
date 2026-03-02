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
    if (!cat.categoryName) return
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
  if (data.aiInsightSummary || (data.aiThemes && data.aiThemes.length > 0) || data.fullAnalysis) {
    // Strip everything outside printable 7-bit ASCII — jsPDF Latin-1 codec
    // corrupts any multi-byte UTF-8 chars (bullets, em-dashes, curly quotes etc.)
    const sanitize = (s: string) =>
      s.replace(/[^\x20-\x7E]/g, ' ').replace(/\s{2,}/g, ' ').trim()

    // ── Start new page for AI Insights section ──
    doc.addPage()
    y = 20

    // Section header banner
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(14)
    doc.setTextColor(91, 33, 182)
    doc.setFillColor(237, 233, 254)
    doc.rect(margin, y, 182, 13, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('AI-Generated Insights', margin + 4, y + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140, 100, 200)
    doc.text('Non-Scoring', margin + 80, y + 9)
    y += 17

    // Disclaimer
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 53, 165)
    doc.text('AI-generated content for reference only. Does not affect scoring.', margin, y)
    y += 4
    doc.setTextColor(140, 100, 200)
    doc.text('5-Dimensional Analysis: Descriptive - Diagnostic - Predictive - Prescriptive - KPI', margin, y)
    y += 10

    // Summary box
    if (data.aiInsightSummary) {
      const cleanSummary = sanitize(data.aiInsightSummary)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(55, 20, 100)

      const lines = doc.splitTextToSize(cleanSummary, 170) as string[]
      const lineH = 5
      const padTop = 5
      const padBot = 5
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

      y += boxH + 6
    }

    // Themes
    if (data.aiThemes && data.aiThemes.length > 0) {
      checkPage(20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(91, 33, 182)
      doc.text('Key Themes:', margin, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(60, 60, 60)

      for (const theme of data.aiThemes) {
        const cleanTheme = sanitize(theme)
        if (!cleanTheme) continue
        const tLines = doc.splitTextToSize('- ' + cleanTheme, 170) as string[]
        checkPage(tLines.length * 5 + 3)
        for (let i = 0; i < tLines.length; i++) {
          doc.text(tLines[i], margin + 3, y + i * 5)
        }
        y += tLines.length * 5 + 2
      }
      y += 4
    }

    divider([196, 160, 250])

    // ── 5-Dimensional Analysis ──────────────────────────────────
    const fa = data.fullAnalysis
    if (fa) {
      // Helper for dimension section headers
      const dimHeader = (icon: string, title: string, subtitle: string) => {
        checkPage(40)
        doc.setFillColor(245, 240, 255)
        doc.rect(margin, y, 182, 16, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(75, 25, 160)
        doc.text(`${icon}  ${title}`, margin + 3, y + 7)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(140, 110, 190)
        doc.text(subtitle, margin + 3, y + 13)
        y += 20
      }

      // Helper for bullet lists
      const bulletList = (items: string[], bulletChar = '-', color: [number, number, number] = [60, 60, 60]) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...color)
        for (const item of items) {
          const clean = sanitize(item)
          if (!clean) continue
          const lines = doc.splitTextToSize(`${bulletChar} ${clean}`, 168) as string[]
          checkPage(lines.length * 4.5 + 3)
          for (let i = 0; i < lines.length; i++) {
            doc.text(lines[i], margin + 4, y + i * 4.5)
          }
          y += lines.length * 4.5 + 1.5
        }
      }

      // Helper for stat box
      const statBox = (label: string, value: string, x: number, w: number) => {
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(210, 200, 230)
        doc.setLineWidth(0.3)
        doc.rect(x, y, w, 16, 'FD')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(130, 130, 130)
        doc.text(label, x + 3, y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(75, 25, 160)
        doc.text(sanitize(value), x + 3, y + 13)
        doc.setLineWidth(0.2)
      }

      const sectionLabel = (text: string) => {
        checkPage(12)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(text.toUpperCase(), margin, y)
        y += 5
      }

      // ── 1. DESCRIPTIVE ────────────────────────────────────────
      if (fa.descriptive) {
        dimHeader('[1]', 'Descriptive Analysis', 'What happened?')

        if (fa.descriptive.summary) {
          addBody(sanitize(fa.descriptive.summary))
          y += 2
        }

        // Stats grid
        checkPage(24)
        const colW = 44
        const gapX = 2
        statBox('Total Respondents', String(fa.descriptive.totalRespondents ?? '--'), margin, colW)
        statBox('Avg Score', fa.descriptive.averageScore != null ? `${fa.descriptive.averageScore}/100` : '--', margin + colW + gapX, colW)
        statBox('Top Performing', sanitize(fa.descriptive.topPerformingArea ?? '--'), margin + (colW + gapX) * 2, colW)
        statBox('Weakest Area', sanitize(fa.descriptive.weakestArea ?? '--'), margin + (colW + gapX) * 3, colW)
        y += 20

        if (fa.descriptive.responseRateNote) {
          checkPage(10)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.text(`Sample Confidence: ${sanitize(fa.descriptive.responseRateNote)}`, margin, y)
          y += 6
        }

        if (fa.descriptive.highlights?.length) {
          sectionLabel('Data Highlights')
          bulletList(fa.descriptive.highlights, '>', [70, 50, 130])
        }
        y += 4
        divider([220, 210, 240])
      }

      // ── 2. DIAGNOSTIC ─────────────────────────────────────────
      if (fa.diagnostic) {
        dimHeader('[2]', 'Diagnostic Analysis', 'Why did it happen?')

        if (fa.diagnostic.summary) {
          addBody(sanitize(fa.diagnostic.summary))
          y += 2
        }

        if (fa.diagnostic.rootCauses?.length) {
          sectionLabel('Root Causes')
          bulletList(fa.diagnostic.rootCauses, '>', [180, 60, 60])
        }

        if (fa.diagnostic.frictionPoints?.length) {
          sectionLabel('Friction Points')
          bulletList(fa.diagnostic.frictionPoints, '!', [200, 140, 0])
        }

        if (fa.diagnostic.riskAreas?.length) {
          sectionLabel('Risk Areas')
          bulletList(fa.diagnostic.riskAreas, '*', [220, 100, 30])
        }

        if (fa.diagnostic.segmentInsights?.length) {
          sectionLabel('Segment Insights')
          bulletList(fa.diagnostic.segmentInsights, '-', [60, 90, 160])
        }
        y += 4
        divider([220, 210, 240])
      }

      // ── 3. PREDICTIVE ─────────────────────────────────────────
      if (fa.predictive) {
        dimHeader('[3]', 'Predictive Analysis', 'What might happen?')

        if (fa.predictive.summary) {
          addBody(sanitize(fa.predictive.summary))
          y += 2
        }

        // Trend + Risk indicators
        checkPage(22)
        if (fa.predictive.trendOutlook || fa.predictive.riskLevel) {
          const trendLabels: Record<string, string> = { improving: 'Improving ^', stable: 'Stable ->', declining: 'Declining v' }
          const riskLabels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }
          const trendColors: Record<string, [number, number, number]> = { improving: [34, 160, 80], stable: [120, 120, 120], declining: [220, 50, 50] }
          const riskColors: Record<string, [number, number, number]> = { low: [34, 160, 80], medium: [200, 160, 0], high: [220, 130, 30], critical: [220, 40, 40] }

          if (fa.predictive.trendOutlook) {
            statBox('Trend Outlook', trendLabels[fa.predictive.trendOutlook] ?? fa.predictive.trendOutlook, margin, 60)
            // Override color for the trend value
            const tc = trendColors[fa.predictive.trendOutlook] ?? [75, 25, 160]
            doc.setTextColor(...tc)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10)
            doc.text(trendLabels[fa.predictive.trendOutlook] ?? fa.predictive.trendOutlook, margin + 3, y + 13)
          }
          if (fa.predictive.riskLevel) {
            const riskX = fa.predictive.trendOutlook ? margin + 64 : margin
            statBox('Risk Level', riskLabels[fa.predictive.riskLevel] ?? fa.predictive.riskLevel, riskX, 60)
            const rc = riskColors[fa.predictive.riskLevel] ?? [75, 25, 160]
            doc.setTextColor(...rc)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10)
            doc.text(riskLabels[fa.predictive.riskLevel] ?? fa.predictive.riskLevel, riskX + 3, y + 13)
          }
          y += 20
        }

        if (fa.predictive.churnSignals?.length) {
          sectionLabel('Churn / Retention Signals')
          bulletList(fa.predictive.churnSignals, '!', [200, 60, 60])
        }

        if (fa.predictive.forecastNotes?.length) {
          sectionLabel('Forecast Notes')
          bulletList(fa.predictive.forecastNotes, '>', [60, 100, 180])
        }
        y += 4
        divider([220, 210, 240])
      }

      // ── 4. PRESCRIPTIVE ───────────────────────────────────────
      if (fa.prescriptive) {
        dimHeader('[4]', 'Prescriptive Analysis', 'What should we do?')

        if (fa.prescriptive.summary) {
          addBody(sanitize(fa.prescriptive.summary))
          y += 2
        }

        if (fa.prescriptive.actionPlan?.length) {
          sectionLabel('Action Plan')
          autoTable(doc, {
            startY: y,
            head: [['Priority', 'Action', 'Timeline', 'Owner', 'Impact']],
            body: fa.prescriptive.actionPlan.map((item: { priority: string; action: string; timeline: string; owner: string; impact: string }) => [
              (item.priority ?? '').toUpperCase(),
              sanitize(item.action ?? ''),
              sanitize(item.timeline ?? ''),
              sanitize(item.owner ?? ''),
              sanitize(item.impact ?? ''),
            ]),
            styles: { fontSize: 7.5, cellPadding: 3 },
            headStyles: { fillColor: [91, 33, 182], textColor: 255, fontSize: 7.5 },
            alternateRowStyles: { fillColor: [250, 245, 255] },
            columnStyles: {
              0: { cellWidth: 18, fontStyle: 'bold' },
              1: { cellWidth: 55 },
              2: { cellWidth: 28 },
              3: { cellWidth: 28 },
              4: { cellWidth: 46 },
            },
            margin: { left: margin, right: margin },
          })
          y = doc.lastAutoTable.finalY + 8
        }

        if (fa.prescriptive.topImprovements?.length) {
          sectionLabel('Top Improvements')
          bulletList(fa.prescriptive.topImprovements, '>', [34, 160, 80])
        }

        if (fa.prescriptive.successMetrics?.length) {
          sectionLabel('Success Metrics')
          bulletList(fa.prescriptive.successMetrics, '*', [34, 160, 80])
        }
        y += 4
        divider([220, 210, 240])
      }

      // ── 5. KPI VIEW ───────────────────────────────────────────
      if (fa.kpi) {
        dimHeader('[5]', 'KPI Dashboard View', 'Executive Summary')

        if (fa.kpi.executiveSummary) {
          addBody(sanitize(fa.kpi.executiveSummary))
          y += 2
        }

        // KPI stat boxes
        checkPage(24)
        const kpiColW = 44
        const kpiGap = 2

        // Health Score
        const healthVal = fa.kpi.overallHealth != null ? fa.kpi.overallHealth.toFixed(0) : '--'
        statBox('Health Score', healthVal, margin, kpiColW)
        // Color override for health
        if (fa.kpi.overallHealth != null) {
          const hc: [number, number, number] = fa.kpi.overallHealth >= 70 ? [34, 160, 80] : fa.kpi.overallHealth >= 50 ? [200, 160, 0] : [220, 40, 40]
          doc.setTextColor(...hc)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.text(healthVal, margin + 3, y + 13)
        }

        // Meeting Goal
        statBox('Meeting Goal?', fa.kpi.meetsGoal ? 'Yes' : 'Not yet', margin + kpiColW + kpiGap, kpiColW)
        const goalColor: [number, number, number] = fa.kpi.meetsGoal ? [34, 160, 80] : [220, 40, 40]
        doc.setTextColor(...goalColor)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(fa.kpi.meetsGoal ? 'Yes' : 'Not yet', margin + kpiColW + kpiGap + 3, y + 13)

        // Trend
        const trendVal = fa.kpi.trend ? fa.kpi.trend.charAt(0).toUpperCase() + fa.kpi.trend.slice(1) : '--'
        statBox('Trend', trendVal, margin + (kpiColW + kpiGap) * 2, kpiColW)

        // Top Impact Area
        statBox('Top Impact', sanitize(fa.kpi.topImpactArea ?? '--'), margin + (kpiColW + kpiGap) * 3, kpiColW)
        y += 22

        // Urgent attention & benchmark
        if (fa.kpi.urgentAttention || fa.kpi.performanceVsBenchmark) {
          checkPage(30)
          if (fa.kpi.urgentAttention) {
            doc.setFillColor(255, 245, 245)
            doc.setDrawColor(250, 200, 200)
            doc.setLineWidth(0.3)
            const urgText = sanitize(fa.kpi.urgentAttention)
            const urgLines = doc.splitTextToSize(urgText, 80) as string[]
            const urgH = 8 + urgLines.length * 4.5
            doc.rect(margin, y, 88, urgH, 'FD')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(180, 40, 40)
            doc.text('URGENT ATTENTION', margin + 3, y + 5.5)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(140, 40, 40)
            for (let i = 0; i < urgLines.length; i++) {
              doc.text(urgLines[i], margin + 3, y + 10 + i * 4.5)
            }

            if (fa.kpi.performanceVsBenchmark) {
              doc.setFillColor(245, 255, 245)
              doc.setDrawColor(200, 240, 200)
              const benchText = sanitize(fa.kpi.performanceVsBenchmark)
              const benchLines = doc.splitTextToSize(benchText, 80) as string[]
              const benchH = 8 + benchLines.length * 4.5
              doc.rect(margin + 92, y, 90, Math.max(urgH, benchH), 'FD')
              doc.setFont('helvetica', 'bold')
              doc.setFontSize(7)
              doc.setTextColor(30, 130, 60)
              doc.text('VS BENCHMARK', margin + 95, y + 5.5)
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(8)
              doc.setTextColor(40, 120, 60)
              for (let i = 0; i < benchLines.length; i++) {
                doc.text(benchLines[i], margin + 95, y + 10 + i * 4.5)
              }
              y += Math.max(urgH, benchH) + 6
            } else {
              y += urgH + 6
            }
          } else if (fa.kpi.performanceVsBenchmark) {
            doc.setFillColor(245, 255, 245)
            doc.setDrawColor(200, 240, 200)
            doc.setLineWidth(0.3)
            const benchText = sanitize(fa.kpi.performanceVsBenchmark)
            const benchLines = doc.splitTextToSize(benchText, 168) as string[]
            const benchH = 8 + benchLines.length * 4.5
            doc.rect(margin, y, 182, benchH, 'FD')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(30, 130, 60)
            doc.text('VS BENCHMARK', margin + 3, y + 5.5)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(40, 120, 60)
            for (let i = 0; i < benchLines.length; i++) {
              doc.text(benchLines[i], margin + 3, y + 10 + i * 4.5)
            }
            y += benchH + 6
          }
          doc.setLineWidth(0.2)
        }
        y += 4
        divider([220, 210, 240])
      }
    }
  }

  // ─── Recommended Next Actions ────────────────────────────────
  checkPage(50)
  addTitle('Recommended Next Actions', 12, [17, 24, 39])

  const topIssues = data.scoring.issueRankings.slice(0, 3)
  for (let i = 0; i < topIssues.length; i++) {
    const issue = topIssues[i]
    if (!issue) continue
    checkPage(20)
    const driverLabel = issue.driverTag ? issue.driverTag.replace(/_/g, ' ') : 'Unknown'
    addBody(
      `${i + 1}. Address "${driverLabel}" — Priority Score: ${issue.priorityScore?.toFixed(2) ?? 'N/A'}. ` +
      `Risk: ${issue.risk?.toFixed(1) ?? 'N/A'}%, Friction: ${issue.friction?.toFixed(1) ?? 'N/A'}%.\n` +
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
  addSubtitle(`Executed: ${data.scoring.executedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${data.scoring.executedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`)
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
