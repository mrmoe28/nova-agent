import * as mindee from "mindee";
import { promises as fs } from "fs";

// Initialize the Mindee client
// This will be initialized only once per application lifecycle
let mindeeClient: mindee.Client | null = null;

const initializeClient = () => {
  if (!mindeeClient) {
    if (!process.env.MINDEE_API_KEY) {
      throw new Error("MINDEE_API_KEY is not set in environment variables.");
    }
    mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });
  }
  return mindeeClient;
};

interface OcrResult {
  text: string;
  confidence: number;
  data: any; // The structured data from Mindee
}

/**
 * Performs OCR on a given file using the Mindee API.
 * Uses the FinancialDocumentV1 endpoint which includes energy bill parsing.
 * @param filePath The local path to the file.
 * @param fileType The category of the file ('pdf' or 'image').
 * @returns A promise that resolves to the structured OCR result.
 */
export async function performMindeeOCR(
  filePath: string,
  fileType: "pdf" | "image" | "csv",
): Promise<OcrResult> {
  // Mindee doesn't process CSVs
  if (fileType === "csv") {
    throw new Error("Mindee OCR does not support CSV files.");
  }
  
  try {
    const client = initializeClient();
    const inputSource = client.docFromPath(filePath);

    // Use the Financial Document API as it's a versatile starting point
    // It automatically routes to the best model, including the Invoice and Receipt parsers
    const apiResponse = await client.parse(
        mindee.product.FinancialDocumentV1,
        inputSource
    );

    if (!apiResponse.document) {
      throw new Error("Failed to parse document with Mindee.");
    }

    const { document, pages } = apiResponse;
    
    // The full text is available from all pages
    const fullText = pages.map((page: any) => page.toString()).join("\n");
    
    // The structured data is in the 'prediction' field of the document
    const prediction = document.prediction;

    // Use document-level confidence
    const confidence = document.inference.confidence || 0;

    console.log("Successfully processed document with Mindee.");

    return {
      text: fullText,
      confidence: confidence,
      data: prediction,
    };
  } catch (error) {
    console.error("Error during Mindee OCR processing:", error);
    // Re-throw the error to be caught by the upload handler
    // This will trigger the fallback mechanism
    throw new Error(`Mindee API Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    // Clean up the temporary file
    try {
      await fs.unlink(filePath);
      console.log(`Temporary file deleted: ${filePath}`);
    } catch (cleanupError) {
      console.error(`Failed to delete temporary file: ${filePath}`, cleanupError);
    }
  }
}
