import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/equipment/add-from-search
 * Add equipment from web search results to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      distributorId,
      distributorName,
      distributorUrl,
      itemName,
      manufacturer,
      modelNumber,
      category,
      unitPrice,
      specifications,
      imageUrl,
      sourceUrl,
      inStock,
    } = body;

    // Validate required fields
    if (!itemName || !category || !unitPrice) {
      return NextResponse.json(
        { success: false, error: "Item name, category, and price are required" },
        { status: 400 },
      );
    }

    // Find or create distributor if distributorName is provided
    let finalDistributorId = distributorId;
    if (!finalDistributorId && distributorName) {
      // Try to find existing distributor by name
      const existingDistributor = await prisma.distributor.findFirst({
        where: {
          name: {
            contains: distributorName,
            mode: "insensitive",
          },
        },
      });

      if (existingDistributor) {
        finalDistributorId = existingDistributor.id;
      } else if (distributorUrl) {
        // Create new distributor
        const newDistributor = await prisma.distributor.create({
          data: {
            name: distributorName,
            website: distributorUrl,
            isActive: true,
          },
        });
        finalDistributorId = newDistributor.id;
      } else {
        return NextResponse.json(
          { success: false, error: "Distributor information is required" },
          { status: 400 },
        );
      }
    }

    if (!finalDistributorId) {
      return NextResponse.json(
        { success: false, error: "Distributor ID is required" },
        { status: 400 },
      );
    }

    // Check if equipment already exists
    const existingEquipment = await prisma.equipment.findFirst({
      where: {
        distributorId: finalDistributorId,
        modelNumber: modelNumber || "",
        name: {
          contains: itemName,
          mode: "insensitive",
        },
      },
    });

    if (existingEquipment) {
      // Update existing equipment
      const updated = await prisma.equipment.update({
        where: { id: existingEquipment.id },
        data: {
          unitPrice: parseFloat(unitPrice),
          inStock: inStock ?? true,
          imageUrl: imageUrl || existingEquipment.imageUrl,
          sourceUrl: sourceUrl || existingEquipment.sourceUrl,
          specifications: specifications || existingEquipment.specifications,
        },
      });

      return NextResponse.json({
        success: true,
        equipment: updated,
        action: "updated",
        message: "Equipment updated with new price",
      });
    }

    // Create new equipment
    const equipment = await prisma.equipment.create({
      data: {
        distributorId: finalDistributorId,
        category: category as any,
        name: itemName,
        manufacturer: manufacturer || null,
        modelNumber: modelNumber || "",
        unitPrice: parseFloat(unitPrice),
        inStock: inStock ?? true,
        imageUrl: imageUrl || null,
        sourceUrl: sourceUrl || null,
        specifications: specifications || null,
        isActive: true,
      },
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      equipment,
      action: "created",
      message: "Equipment added to database",
    });
  } catch (error) {
    console.error("Error adding equipment from search:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add equipment",
      },
      { status: 500 },
    );
  }
}

