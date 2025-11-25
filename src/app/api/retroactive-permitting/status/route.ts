/**
 * Retroactive Permitting API - Check Status
 * GET /api/retroactive-permitting/status?projectId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { retroactivePermittingService } from '@/lib/services/retroactive-permitting';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const status = await retroactivePermittingService.checkPermitStatus(projectId);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Status check error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check permit status',
      },
      { status: 500 }
    );
  }
}
