import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { performOCR, parseBillText } from "@/lib/ocr";

/**
 * Process a bill with OCR and store extracted data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billId } = body;

    if (!billId) {
      return NextResponse.json(
        { success: false, error: "Bill ID is required" },
        { status: 400 },
      );
    }

    // Get bill from database
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: "Bill not found" },
        { status: 404 },
      );
    }

    // File path is already absolute (/tmp/uploads/...)
    const filePath = bill.filePath;

    // Perform OCR
    console.log(
      `Starting OCR for bill ${billId} at ${filePath} (${bill.fileType})`,
    );
    const ocrResult = await performOCR(
      filePath,
      bill.fileType as "pdf" | "image" | "csv",
    );

    console.log(`OCR completed with confidence: ${ocrResult.confidence}`);
    console.log(`Extracted text length: ${ocrResult.text.length} characters`);

    // Parse the extracted text
    const parsedData = parseBillText(ocrResult.text);

    console.log("Parsed bill data:", parsedData);

    // Update bill with OCR results
    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        ocrText: ocrResult.text,
        extractedData: JSON.stringify(parsedData),
      },
    });

    return NextResponse.json({
      success: true,
      bill: {
        id: updatedBill.id,
        ocrText: updatedBill.ocrText,
        extractedData: parsedData,
        confidence: ocrResult.confidence,
      },
    });
  } catch (error) {
    console.error("Error processing OCR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process OCR",
      },
      { status: 500 },
    );
  }
}

/**
 * Process all bills for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    // Get all bills for the project
    const bills = await prisma.bill.findMany({
      where: {
        projectId,
        ocrText: null, // Only process bills that haven't been OCR'd yet
      },
    });

    if (bills.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bills to process",
        processed: 0,
      });
    }

    // Process each bill
    const results = [];
    for (const bill of bills) {
      try {
        // File path is already absolute (/tmp/uploads/...)
        const filePath = bill.filePath;
        const ocrResult = await performOCR(
          filePath,
          bill.fileType as "pdf" | "image" | "csv",
        );
        const parsedData = parseBillText(ocrResult.text);

        await prisma.bill.update({
          where: { id: bill.id },
          data: {
            ocrText: ocrResult.text,
            extractedData: JSON.stringify(parsedData),
          },
        });

        results.push({
          billId: bill.id,
          fileName: bill.fileName,
          success: true,
          parsedData,
        });
      } catch (error) {
        results.push({
          billId: bill.id,
          fileName: bill.fileName,
          success: false,
          error: error instanceof Error ? error.message : "OCR failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error processing bills:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process bills" },
      { status: 500 },
    );
  }
}
