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

    // Simulate analysis logic
    // In production, this would parse bill data and calculate usage
    const monthlyUsageKwh = 850 + Math.random() * 300 // Mock: 850-1150 kWh/month
    const peakDemandKw = 5 + Math.random() * 3 // Mock: 5-8 kW peak
    const averageCostPerKwh = 0.12 + Math.random() * 0.08 // Mock: $0.12-0.20/kWh
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
