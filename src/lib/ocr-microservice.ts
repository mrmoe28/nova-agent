/**
 * OCR Microservice Client for NovaAgent
 * Calls the Python FastAPI OCR service for PDF and image extraction
 */

import { readFile } from "fs/promises";

export interface OCRResult {
  text: string;
  confidence?: number;
  pageCount?: number;
  blocks?: Array<{
    text: string;
    confidence: number;
    bbox: number[];
    page?: number;
  }>;
  tables?: Array<{
    page: number;
    rows: string[][];
    strategy: string;
  }>;
  metadata?: {
    engine: string;
    isDigitalPdf?: boolean;
  };
}

interface MicroserviceResponse {
  file_name: string;
  mime_type?: string;
  pages: number;
  is_digital_pdf?: boolean;
  text: string;
  blocks: Array<{
    text: string;
    confidence: number;
    bbox: number[];
    page?: number;
  }>;
  tables: Array<{
    page: number;
    rows: string[][];
    strategy: string;
  }>;
  metadata: {
    engine: string;
  };
}

/**
 * Call the OCR microservice to extract text from a PDF or image
 */
export async function extractWithMicroservice(
  filePath: string,
  wantTables = true
): Promise<OCRResult> {
  const ocrServiceUrl =
    process.env.OCR_SERVICE_URL || "http://localhost:8002";

  try {
    // Read the file
    const fileBuffer = await readFile(filePath);

    // Create FormData for file upload
    const formData = new FormData();
    // Convert Buffer to Uint8Array for Blob compatibility
    const blob = new Blob([new Uint8Array(fileBuffer)], {
      type: filePath.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    });
    formData.append("file", blob, filePath.split("/").pop() || "file");
    formData.append("want_tables", String(wantTables));

    console.log(`Calling OCR microservice at ${ocrServiceUrl}/extract...`);

    // Call the microservice
    const response = await fetch(`${ocrServiceUrl}/extract`, {
      method: "POST",
      body: formData,
      headers: {
        // FormData sets its own content-type with boundary
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OCR microservice returned ${response.status}: ${errorText}`
      );
    }

    const data: MicroserviceResponse = await response.json();

    console.log(
      `OCR extraction complete: ${data.text.length} characters from ${data.pages} page(s) using ${data.metadata.engine}`
    );

    // Calculate average confidence from blocks
    let avgConfidence = 0;
    if (data.blocks && data.blocks.length > 0) {
      const sum = data.blocks.reduce((acc, b) => acc + b.confidence, 0);
      avgConfidence = sum / data.blocks.length;
    }

    return {
      text: data.text,
      confidence: avgConfidence,
      pageCount: data.pages,
      blocks: data.blocks,
      tables: data.tables,
      metadata: {
        engine: data.metadata.engine,
        isDigitalPdf: data.is_digital_pdf,
      },
    };
  } catch (error) {
    console.error("OCR microservice error:", error);
    throw new Error(
      `Failed to extract text via microservice: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if the OCR microservice is running and healthy
 */
export async function checkMicroserviceHealth(): Promise<boolean> {
  const ocrServiceUrl =
    process.env.OCR_SERVICE_URL || "http://localhost:8002";

  try {
    const response = await fetch(`${ocrServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return false;
    }

    const health = await response.json();
    console.log("OCR microservice health:", health);
    return health.ok === true;
  } catch (error) {
    console.error("OCR microservice health check failed:", error);
    return false;
  }
}

/**
 * Main OCR function that uses the microservice
 * Falls back to returning empty data if microservice is unavailable
 */
export async function performOCR(
  filePath: string,
  fileType: "pdf" | "image" | "csv"
): Promise<OCRResult> {
  // CSV files don't need OCR
  if (fileType === "csv") {
    const text = await readFile(filePath, "utf-8");
    return {
      text,
      confidence: 1.0,
      pageCount: 1,
    };
  }

  // Check if microservice is available
  const isHealthy = await checkMicroserviceHealth();
  if (!isHealthy) {
    console.warn(
      "OCR microservice is not available. Please start it with: python3 server/ocr_service.py"
    );
    throw new Error(
      "OCR microservice is not running. Start it with: python3 server/ocr_service.py"
    );
  }

  // Use microservice for PDF and image files
  return await extractWithMicroservice(filePath, true);
}
