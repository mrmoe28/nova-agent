/**
 * Retroactive Permitting API - Create Project
 * POST /api/retroactive-permitting/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { retroactivePermittingService } from '@/lib/services/retroactive-permitting';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientInfo, systemInfo } = body;

    // Validate required fields
    if (!clientInfo?.name || !clientInfo?.address || !systemInfo) {
      return NextResponse.json(
        { error: 'Client information and system details are required' },
        { status: 400 }
      );
    }

    // Parse dates
    if (systemInfo.installationDate) {
      systemInfo.installationDate = new Date(systemInfo.installationDate);
    }

    // Create retroactive permitting project
    const projectId = await retroactivePermittingService.createRetroactiveProject(
      clientInfo,
      systemInfo
    );

    // Generate permit completion plan
    const plan = await retroactivePermittingService.generatePermitCompletionPlan(
      projectId,
      systemInfo
    );

    return NextResponse.json({
      success: true,
      projectId,
      plan,
    });
  } catch (error) {
    console.error('Retroactive permitting error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create retroactive permitting project',
      },
      { status: 500 }
    );
  }
}
