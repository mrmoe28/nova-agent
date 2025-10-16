import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, backupDurationHrs, criticalLoadKw } = body

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Get analysis data
    const analysis = await prisma.analysis.findUnique({
      where: { projectId },
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis must be completed first' },
        { status: 400 }
      )
    }

    // Calculate system sizing
    const monthlyUsageKwh = analysis.monthlyUsageKwh
    const dailyUsageKwh = monthlyUsageKwh / 30
    const solarSizingFactor = 1.2 // 120% to account for losses

    const totalSolarKw = (dailyUsageKwh / 4) * solarSizingFactor // Assuming 4 peak sun hours
    const solarPanelWattage = 400 // Standard 400W panels
    const solarPanelCount = Math.ceil((totalSolarKw * 1000) / solarPanelWattage)

    // Battery sizing
    const backupHrs = backupDurationHrs || 24
    const criticalLoad = criticalLoadKw || 3
    const batteryKwh = criticalLoad * backupHrs * 1.2 // 20% overhead

    const inverterKw = Math.max(analysis.peakDemandKw || 5, criticalLoad) * 1.25

    // Cost estimation
    const solarCostPerWatt = 2.5
    const batteryCostPerKwh = 800
    const inverterCostPerKw = 1200
    const installationCost = 5000

    const estimatedCostUsd =
      totalSolarKw * 1000 * solarCostPerWatt +
      batteryKwh * batteryCostPerKwh +
      inverterKw * inverterCostPerKw +
      installationCost

    // Save system design
    const system = await prisma.system.upsert({
      where: { projectId },
      create: {
        projectId,
        solarPanelCount,
        solarPanelWattage,
        totalSolarKw: parseFloat(totalSolarKw.toFixed(2)),
        batteryKwh: parseFloat(batteryKwh.toFixed(2)),
        batteryType: 'lithium',
        inverterKw: parseFloat(inverterKw.toFixed(2)),
        inverterType: 'Hybrid String Inverter',
        backupDurationHrs: backupHrs,
        criticalLoadKw: criticalLoad,
        estimatedCostUsd: parseFloat(estimatedCostUsd.toFixed(2)),
      },
      update: {
        solarPanelCount,
        solarPanelWattage,
        totalSolarKw: parseFloat(totalSolarKw.toFixed(2)),
        batteryKwh: parseFloat(batteryKwh.toFixed(2)),
        batteryType: 'lithium',
        inverterKw: parseFloat(inverterKw.toFixed(2)),
        inverterType: 'Hybrid String Inverter',
        backupDurationHrs: backupHrs,
        criticalLoadKw: criticalLoad,
        estimatedCostUsd: parseFloat(estimatedCostUsd.toFixed(2)),
      },
    })

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'sizing' },
    })

    return NextResponse.json({ success: true, system })
  } catch (error) {
    console.error('Error sizing system:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to size system' },
      { status: 500 }
    )
  }
}
