/**
 * OpenSolar Connection Test API
 * GET /api/opensolar/test
 * Tests the OpenSolar API connection
 */

import { NextResponse } from 'next/server';
import { openSolarService } from '@/lib/services/opensolar';

export async function GET() {
  try {
    const result = await openSolarService.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        organizationName: result.organizationName,
        configured: true,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          configured: openSolarService.isConfigured(),
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('OpenSolar test error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test OpenSolar connection',
        configured: openSolarService.isConfigured(),
      },
      { status: 500 }
    );
  }
}
