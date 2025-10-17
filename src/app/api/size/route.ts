import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SYSTEM_SIZING } from '@/lib/config'

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
    const solarSizingFactor = SYSTEM_SIZING.SOLAR_SIZING_FACTOR

    const totalSolarKw = (dailyUsageKwh / SYSTEM_SIZING.PEAK_SUN_HOURS) * solarSizingFactor
    const solarPanelWattage = SYSTEM_SIZING.SOLAR_PANEL_WATTAGE
    const solarPanelCount = Math.ceil((totalSolarKw * 1000) / solarPanelWattage)

    // Battery sizing
    const backupHrs = backupDurationHrs || 24
    const criticalLoad = criticalLoadKw || 3
    const batteryKwh = criticalLoad * backupHrs * SYSTEM_SIZING.BATTERY_OVERHEAD

    const inverterKw = Math.max(analysis.peakDemandKw || 5, criticalLoad) * SYSTEM_SIZING.INVERTER_MULTIPLIER

    // Cost estimation
    const solarCostPerWatt = SYSTEM_SIZING.SOLAR_COST_PER_WATT
    const batteryCostPerKwh = SYSTEM_SIZING.BATTERY_COST_PER_KWH
    const inverterCostPerKw = SYSTEM_SIZING.INVERTER_COST_PER_KW
    const installationCost = SYSTEM_SIZING.INSTALLATION_BASE_COST

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
