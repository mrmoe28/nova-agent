import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Debug endpoint to see full error details for project creation
 */
export async function GET() {
  try {
    console.log("Attempting to create test project...");
    
    const project = await prisma.project.create({
      data: {
        clientName: "Debug Test Project",
        address: "123 Debug St",
        phone: "555-0000",
        email: "debug@test.com",
        status: "intake",
      },
    });

    console.log("✓ Project created successfully:", project.id);

    return NextResponse.json({
      success: true,
      message: "Project created successfully",
      projectId: project.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Return full error details for debugging
    console.error("Error creating project:", error);
    
    const errorDetails = {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "Unknown",
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };
    
    console.log("Error details:", JSON.stringify(errorDetails, null, 2));
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}
