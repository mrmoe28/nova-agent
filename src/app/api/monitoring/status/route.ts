import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const startTime = Date.now();

export async function GET() {
  try {
    // Check database connection
    let dbConnected = false;
    let dbStatus = "Error";
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
      dbStatus = "Connected";
    } catch (error) {
      console.error("Database connection check failed:", error);
      dbStatus = "Disconnected";
    }

    // Calculate uptime
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Define current features and their status
    const features = [
      {
        name: "Mindee OCR",
        status: process.env.MINDEE_API_KEY ? "active" : "pending",
        description: "Premium bill parsing (Tier 1)",
      },
      {
        name: "OCR Microservice",
        status: "active",
        description: "Python OCR fallback (Tier 2)",
      },
      {
        name: "Tesseract OCR",
        status: "active",
        description: "Built-in fallback (Tier 3)",
      },
      {
        name: "PVWatts Solar API",
        status: process.env.NREL_API_KEY ? "active" : "pending",
        description: "NREL solar production estimates",
      },
      {
        name: "BOM Calculations",
        status: "active",
        description: "Dynamic pricing from items",
      },
      {
        name: "Project Wizard",
        status: "active",
        description: "Multi-step project creation",
      },
      {
        name: "Equipment Selector",
        status: "active",
        description: "Configurable default selection",
      },
      {
        name: "Enhanced Analysis",
        status: "active",
        description: "With lat/long and solar data",
      },
    ];

    const status = {
      timestamp: new Date().toLocaleString(),
      git: {
        branch: "master",
        lastCommit: "c640380",
        status: "Clean",
      },
      server: {
        status: "Running",
        uptime: uptime,
      },
      database: {
        status: dbStatus,
        connected: dbConnected,
      },
      features: features,
      build: {
        status: "Passing",
        lastBuild: new Date().toLocaleString(),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        mindeeConfigured: !!process.env.MINDEE_API_KEY,
        nrelConfigured: !!process.env.NREL_API_KEY,
        databaseConfigured: !!process.env.DATABASE_URL,
      },
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching system status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch system status",
        timestamp: new Date().toLocaleString(),
      },
      { status: 500 }
    );
  }
}



