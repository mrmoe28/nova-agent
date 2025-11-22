import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocoding";
import { getPVWattsProduction } from "@/lib/pvwatts";
import { getApplicableIncentives } from "@/lib/incentives";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    // 1. Fetch Project, Bills, and any existing simple analysis
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { bills: true, analysis: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }
    
    if (project.bills.length === 0) {
        return NextResponse.json(
          { success: false, error: "No bills found for analysis" },
          { status: 400 },
        );
    }

    // 2. Get average usage from existing analysis or calculate it
    let monthlyUsageKwh = project.analysis?.monthlyUsageKwh;
    let averageCostPerKwh = project.analysis?.averageCostPerKwh;
    
    if (!monthlyUsageKwh || !averageCostPerKwh) {
        let totalKwh = 0;
        let totalCost = 0;
        let billsWithData = 0;
        for (const bill of project.bills) {
            if (bill.extractedData) {
                const data = JSON.parse(bill.extractedData);
                if (data.usage?.kwh) {
                    totalKwh += data.usage.kwh;
                    billsWithData++;
                }
                if (data.charges?.total) {
                    totalCost += data.charges.total;
                }
            }
        }
        if (billsWithData > 0) {
            monthlyUsageKwh = totalKwh / billsWithData;
            averageCostPerKwh = totalCost / totalKwh;
        } else {
            // Fallback to demo data if no OCR data is available
            monthlyUsageKwh = 1200;
            averageCostPerKwh = 0.15;
        }
    }
    
    const annualUsageKwh = monthlyUsageKwh * 12;

    // 3. Geocode the project address
    if (!project.address) {
      return NextResponse.json(
        { success: false, error: "Project address is required for enhanced analysis" },
        { status: 400 },
      );
    }
    
    const coordinates = await geocodeAddress(project.address);
    if (!coordinates) {
        return NextResponse.json(
            { success: false, error: `Failed to geocode address: ${project.address}` },
            { status: 500 },
        );
    }

    // 4. Get a preliminary system size
    const systemCapacityKw = (monthlyUsageKwh / 30) / 4;
    const systemCapacityWatts = systemCapacityKw * 1000;

    // 5. Call PVWatts API
    const pvWattsOutput = await getPVWattsProduction({
        lat: coordinates.latitude,
        lon: coordinates.longitude,
        system_capacity: systemCapacityKw,
        tilt: Math.min(90, Math.max(0, coordinates.latitude)), // Clamp to valid range
        azimuth: 180, // South-facing (default)
        array_type: 1, // Fixed roof mount
        module_type: 0, // Standard
        losses: 14, // Standard losses
        radius: 0,
        dataset: "NSRDB",
    });

    const annualSolarProductionKwh = pvWattsOutput.ac_annual;

    // 6. Calculate Financials (Pre-Incentives)
    const energyOffsetPercentage = Math.min(1, annualSolarProductionKwh / annualUsageKwh) * 100;
    const estimatedAnnualSavingsUsd = annualSolarProductionKwh * averageCostPerKwh;
    
    // Use a placeholder cost per watt to estimate gross system cost
    const costPerWatt = 3.00; 
    const grossSystemCost = systemCapacityWatts * costPerWatt;

    // 7. Fetch and Apply Incentives
    const zipCodeMatch = project.address.match(/\b\d{5}\b/);
    const zipCode = zipCodeMatch ? zipCodeMatch[0] : "";
    
    let netSystemCost = grossSystemCost;
    let totalIncentivesValue = 0;
    const appliedIncentives = [];

    if (zipCode) {
        const incentives = await getApplicableIncentives({ zip: zipCode });
        for (const incentive of incentives) {
            let incentiveValue = 0;
            if (incentive.value_type === 'percent' && incentive.value < 1) { // e.g., 0.30 for 30%
                incentiveValue = grossSystemCost * incentive.value;
            } else if (incentive.value_type === 'dollar_amount') {
                incentiveValue = incentive.value;
            }
            
            if (incentiveValue > 0) {
                netSystemCost -= incentiveValue;
                totalIncentivesValue += incentiveValue;
                appliedIncentives.push(`${incentive.program_name}: ~${incentiveValue.toFixed(0)}`);
            }
        }
    }

    // 8. Final Recommendations
    const recommendations = [
        `Recommended system size: ${systemCapacityKw.toFixed(2)} kW`,
        `Estimated annual production: ${Math.round(annualSolarProductionKwh)} kWh`,
        `This could offset ~${energyOffsetPercentage.toFixed(0)}% of your annual electricity usage.`,
        `Estimated annual savings: ${estimatedAnnualSavingsUsd.toFixed(2)}`,
        `Estimated net system cost after incentives: ${netSystemCost.toFixed(2)} (includes ~${totalIncentivesValue.toFixed(0)} in incentives)`,
        ...appliedIncentives,
    ];

    const analysisData = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        annualSolarProductionKwh,
        energyOffsetPercentage,
        estimatedAnnualSavingsUsd,
        grossSystemCost,
        netSystemCost,
        totalIncentivesValue,
        recommendations: JSON.stringify(recommendations),
    };

    // 9. Save the enhanced analysis to the database
    // This part is commented out until the database migration issue is resolved by a developer.
    /*
    // TODO: UNCOMMENT THIS BLOCK AFTER DATABASE MIGRATION IS FIXED
    console.log("Saving enhanced analysis to database...");
    const updatedAnalysis = await prisma.analysis.update({
        where: { projectId },
        data: analysisData,
    });
    console.log("Successfully saved enhanced analysis.");
    */

    // Return the calculated data without saving it
    const finalAnalysisResult = {
        projectId,
        monthlyUsageKwh,
        averageCostPerKwh,
        ...analysisData,
        persisted: false, 
    };

    return NextResponse.json({
        success: true,
        analysis: finalAnalysisResult
    });

  } catch (error) {
    console.error("Error during enhanced analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: `Failed to perform enhanced analysis: ${errorMessage}` },
      { status: 500 },
    );
  }
}