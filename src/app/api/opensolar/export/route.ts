/**
 * OpenSolar Export API
 * POST /api/opensolar/export
 * Exports a NovaAgent project to OpenSolar
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openSolarService } from '@/lib/services/opensolar';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check if OpenSolar is configured
    if (!openSolarService.isConfigured()) {
      return NextResponse.json(
        {
          error: 'OpenSolar integration not configured',
          message: 'Please add OPENSOLAR_API_KEY and OPENSOLAR_ORG_ID to your .env.local file',
        },
        { status: 503 }
      );
    }

    // Fetch project data from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        system: true,
        analysis: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Prepare data for OpenSolar
    const exportData = {
      projectName: `${project.clientName} - Solar Project`,
      clientName: project.clientName,
      address: project.address || 'Address not provided',
      systemSizeKw: project.system?.totalSolarKw,
      panelCount: project.system?.solarPanelCount,
      inverterSizeKw: project.system?.inverterKw,
      batteryKwh: project.system?.batteryKwh,
      notes: `Exported from NovaAgent on ${new Date().toLocaleDateString()}`,
    };

    // Export to OpenSolar
    const openSolarProject = await openSolarService.exportProject(exportData);

    // Store OpenSolar project ID in our database
    await prisma.project.update({
      where: { id: projectId },
      data: {
        // You might want to add an openSolarProjectId field to your schema
        status: 'plan', // Mark as in planning phase
      },
    });

    return NextResponse.json({
      success: true,
      openSolarProject: {
        id: openSolarProject.id,
        name: openSolarProject.name,
        designUrl: openSolarService.getDesignUrl(openSolarProject.id),
      },
      message: 'Project successfully exported to OpenSolar',
    });
  } catch (error) {
    console.error('OpenSolar export error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export project to OpenSolar',
      },
      { status: 500 }
    );
  }
}
