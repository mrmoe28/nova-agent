import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/distributors
 * List all distributors with equipment counts and a small thumbnail sample.
 *
 * This powers the Distributors tab in the UI.
 */
export async function GET(_request: NextRequest) {
  try {
    const distributors = await prisma.distributor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { equipment: true },
        },
        equipment: {
          select: {
            id: true,
            category: true,
            name: true,
            imageUrl: true,
          },
          take: 3, // small sample for thumbnail images
        },
      },
    });

    return NextResponse.json({ success: true, distributors });
  } catch (error) {
    console.error("Error fetching distributors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch distributors" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/distributors
 * Create a new distributor (manual add from the UI form).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic shape matches the DistributorForm payload
    const {
      name,
      contactName,
      email,
      phone,
      website,
      address,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }

    const distributor = await prisma.distributor.create({
      data: {
        name,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, distributor });
  } catch (error) {
    console.error("Error creating distributor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create distributor" },
      { status: 500 },
    );
  }
}


