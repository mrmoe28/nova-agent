import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/distributors - List all distributors
 */
export async function GET() {
  try {
    const distributors = await prisma.distributor.findMany({
      include: {
        equipment: {
          select: {
            id: true,
            category: true,
            imageUrl: true,
            name: true,
          },
          where: {
            imageUrl: {
              not: null,
            },
          },
          take: 1, // Just get one item with an image for the thumbnail
        },
        _count: {
          select: {
            equipment: true, // Get total count of all equipment
          },
        },
      },
      orderBy: { name: "asc" },
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
 * POST /api/distributors - Create new distributor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contactName, email, phone, website, address, notes } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Distributor name is required" },
        { status: 400 },
      );
    }

    const distributor = await prisma.distributor.create({
      data: {
        name,
        contactName,
        email,
        phone,
        website,
        address,
        notes,
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
