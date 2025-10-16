import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Get bills for the project
    const bills = await prisma.bill.findMany({
      where: { projectId },
    })

    if (bills.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No bills found for analysis' },
        { status: 400 }
      )
    }

    // Try to use OCR data if available
    let monthlyUsageKwh = 0
    let peakDemandKw = 0
    let totalCost = 0
    let billsWithData = 0

    for (const bill of bills) {
      if (bill.extractedData) {
        try {
          const data = JSON.parse(bill.extractedData)
          if (data.usage?.kwh) {
            monthlyUsageKwh += data.usage.kwh
            billsWithData++
          }
          if (data.usage?.kw) {
            peakDemandKw = Math.max(peakDemandKw, data.usage.kw)
          }
          if (data.charges?.total) {
            totalCost += data.charges.total
          }
        } catch (error) {
          console.error('Error parsing bill data:', error)
        }
      }
    }

    // If we have OCR data, use it; otherwise fall back to demo data
    if (billsWithData > 0) {
      // Average the monthly usage if we have multiple bills
      monthlyUsageKwh = monthlyUsageKwh / billsWithData
    } else {
      // Use demo data
      console.log('No OCR data available, using demo values')
      monthlyUsageKwh = 850 + Math.random() * 300 // Mock: 850-1150 kWh/month
      peakDemandKw = 5 + Math.random() * 3 // Mock: 5-8 kW peak
    }

    // Calculate cost per kWh
    const averageCostPerKwh = totalCost > 0 && monthlyUsageKwh > 0
      ? totalCost / monthlyUsageKwh
      : 0.12 + Math.random() * 0.08 // Fallback: $0.12-0.20/kWh

    const annualCostUsd = monthlyUsageKwh * 12 * averageCostPerKwh

    const recommendations = [
      `Monthly average usage: ${Math.round(monthlyUsageKwh)} kWh`,
      `Peak demand: ${peakDemandKw.toFixed(1)} kW`,
      `Recommended solar capacity: ${Math.round(monthlyUsageKwh / 30 / 4)} kW`,
      `Consider battery backup for critical loads`,
    ]

    // Save analysis
    const analysis = await prisma.analysis.upsert({
      where: { projectId },
      create: {
        projectId,
        monthlyUsageKwh,
        peakDemandKw,
        averageCostPerKwh,
        annualCostUsd,
        recommendations: JSON.stringify(recommendations),
      },
      update: {
        monthlyUsageKwh,
        peakDemandKw,
        averageCostPerKwh,
        annualCostUsd,
        recommendations: JSON.stringify(recommendations),
      },
    })

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'analysis' },
    })

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        recommendations: JSON.parse(analysis.recommendations),
      },
    })
  } catch (error) {
    console.error('Error analyzing bills:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze bills' },
      { status: 500 }
    )
  }
}
