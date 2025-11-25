/**
 * System Comparison API Route
 * GET /api/system-comparison?projectId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemComparisonService } from '@/lib/services/system-comparison';

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

    const comparison = await systemComparisonService.generateComparison(projectId);

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('System comparison error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate system comparison',
      },
      { status: 500 }
    );
  }
}
