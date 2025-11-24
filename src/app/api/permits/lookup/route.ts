import { NextRequest, NextResponse } from "next/server";
import { lookupPermitOffice, calculateTotalFees } from "@/lib/permit-office-lookup";

/**
 * POST /api/permits/lookup
 * Lookup permit office by customer address
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address is required" },
        { status: 400 }
      );
    }

    const office = await lookupPermitOffice(address);
    const totalFees = calculateTotalFees(office);

    return NextResponse.json({
      success: true,
      office: {
        ...office,
        totalFees,
      },
    });
  } catch (error) {
    console.error("Error looking up permit office:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to lookup permit office",
      },
      { status: 500 }
    );
  }
}

