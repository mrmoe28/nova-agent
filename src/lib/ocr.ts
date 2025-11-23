import { readFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { retryWithTimeout, generateErrorMessage, isNetworkError } from "./ocr-utils";
// Dynamic import for pdf-parse and Tesseract to avoid serverless environment issues

export interface OCRResult {
  text: string;
  confidence?: number;
  pageCount?: number;
}

/**
 * Extract text and structured data from PDF using Claude AI
 * This provides the most accurate extraction with intelligent parsing
 * Includes retry logic and timeout handling for robustness
 */
export async function extractTextWithClaude(
  filePath: string,
): Promise<OCRResult> {
  return retryWithTimeout(
    async () => {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Read PDF file as buffer
      const pdfBuffer = await readFile(filePath);
      const base64Pdf = pdfBuffer.toString("base64");

      console.log("Using Claude AI for PDF extraction...");

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf,
                },
              },
              {
                type: "text",
                text: "Please extract ALL text content from this utility bill PDF. Return the complete text exactly as it appears in the document, preserving formatting, numbers, and structure. Do not summarize or interpret - just extract the raw text.",
              },
            ],
          },
        ],
      });

      const extractedText = message.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("\n");

      console.log(
        `Claude extraction complete: ${extractedText.length} characters`,
      );

      return {
        text: extractedText,
        confidence: 0.98, // Claude's accuracy is very high
        pageCount: 1,
      };
    },
    {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      retryableErrors: ["ETIMEDOUT", "ECONNRESET", "timeout", "network", "connection"],
    },
    {
      timeoutMs: 120000, // 2 minutes for Claude API
      timeoutMessage: "Claude AI extraction timed out",
    }
  ).catch((error) => {
    const friendlyError = new Error(
      generateErrorMessage(error, "Claude AI PDF extraction")
    );
    friendlyError.cause = error;
    throw friendlyError;
  });
}

/**
 * Extract text from PDF file using pdf-parse (most reliable fallback)
 * Fallback method if Claude is unavailable
 */
// Type definition for pdf-parse module (CommonJS)
interface PdfParseModule {
  default: (dataBuffer: Buffer) => Promise<{
    text: string;
    numpages: number;
  }>;
}

export async function extractTextFromPDF(filePath: string): Promise<OCRResult> {
  return retryWithTimeout(
    async () => {
      const dataBuffer = await readFile(filePath);

      // Dynamic import of pdf-parse (proper way to handle CommonJS in Next.js)
      const pdfParseModule = await import("pdf-parse") as unknown as PdfParseModule;
      // pdf-parse exports the function as default
      const pdfParse = pdfParseModule.default;

      console.log("Using pdf-parse for text extraction...");
      
      // Use pdf-parse to extract text from PDF buffer
      const pdfData = await pdfParse(dataBuffer);

      console.log(`PDF parsed successfully: ${pdfData.text.length} characters, ${pdfData.numpages} pages`);

      return {
        text: pdfData.text || "",
        pageCount: pdfData.numpages || 1,
        confidence: 0.95, // PDF text extraction is usually highly accurate
      };
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 5000,
    },
    {
      timeoutMs: 60000, // 1 minute for pdf-parse
      timeoutMessage: "PDF parsing timed out",
    }
  ).catch((error) => {
    const friendlyError = new Error(
      generateErrorMessage(error, "PDF text extraction")
    );
    friendlyError.cause = error;
    throw friendlyError;
  });
}

/**
 * Extract text from image file using OCR
 * Note: OCR is disabled in serverless environments due to canvas dependency issues
 */
export async function extractTextFromImage(
  filePath: string,
): Promise<OCRResult> {
  return retryWithTimeout(
    async () => {
      // Check if we're in a serverless environment (Vercel, Lambda, etc.)
      const isServerless =
        process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

      if (isServerless) {
        console.warn(
          "OCR disabled in serverless environment - canvas/DOMMatrix not available",
        );
        throw new Error("Image OCR is not available in serverless environments. Please use PDF files instead.");
      }

      // Dynamic import to avoid loading Tesseract in serverless environments
      const Tesseract = await import("tesseract.js");

      const result = await Tesseract.default.recognize(filePath, "eng", {
        logger: (info) => {
          if (info.status === "recognizing text") {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        },
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence / 100, // Convert to 0-1 scale
      };
    },
    {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 8000,
    },
    {
      timeoutMs: 180000, // 3 minutes for Tesseract (can be slow)
      timeoutMessage: "Image OCR processing timed out",
    }
  ).catch((error) => {
    const friendlyError = new Error(
      generateErrorMessage(error, "image OCR processing")
    );
    friendlyError.cause = error;
    throw friendlyError;
  });
}

/**
 * Main OCR function that handles different file types
 * Uses Claude AI for PDFs when available, falls back to pdf-parse
 */
export async function performOCR(
  filePath: string,
  fileType: "pdf" | "image" | "csv",
): Promise<OCRResult> {
  if (fileType === "pdf") {
    // Try Claude AI extraction first (most accurate)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log("Attempting Claude AI PDF extraction...");
        return await extractTextWithClaude(filePath);
      } catch (claudeError) {
        console.warn(
          "Claude extraction failed, falling back to pdf-parse:",
          claudeError instanceof Error ? claudeError.message : "Unknown error",
        );
        // Fall back to pdf-parse extraction
        try {
          return await extractTextFromPDF(filePath);
        } catch (pdfError) {
          console.error("Both Claude AI and pdf-parse failed:", pdfError);
          // Throw error - do not return fake data, let caller handle the failure
          throw new Error(`OCR processing failed for both Claude AI and pdf-parse: ${pdfError instanceof Error ? pdfError.message : "Unknown error"}`);
        }
      }
    } else {
      console.log("No ANTHROPIC_API_KEY found, using pdf-parse for PDF extraction");
      return extractTextFromPDF(filePath);
    }
  } else if (fileType === "image") {
    return extractTextFromImage(filePath);
  } else if (fileType === "csv") {
    // Enhanced CSV parsing with structured extraction
    return parseCSVFile(filePath);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

/**
 * Parse CSV file and extract structured bill data
 * Handles various CSV formats for utility bills
 */
async function parseCSVFile(filePath: string): Promise<OCRResult> {
  try {
    const csvContent = await readFile(filePath, "utf-8");
    const lines = csvContent.split("\n").filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        text: csvContent,
        confidence: 1.0,
      };
    }

    // Try to detect CSV structure
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    
    // Build structured text representation for parsing
    let structuredText = "";
    
    // Common CSV patterns for utility bills
    const datePattern = /date|period|billing|service/i;
    const usagePattern = /kwh|usage|consumption|energy/i;
    const costPattern = /cost|charge|amount|total|due|price/i;
    const accountPattern = /account|acct|customer|id/i;
    
    // Extract relevant data from CSV
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      
      for (let j = 0; j < headers.length && j < values.length; j++) {
        const header = headers[j];
        const value = values[j];
        
        if (value && value.length > 0) {
          // Format as key-value pairs for parsing
          if (datePattern.test(header)) {
            structuredText += `${header}: ${value}\n`;
          } else if (usagePattern.test(header)) {
            structuredText += `${header}: ${value}\n`;
          } else if (costPattern.test(header)) {
            structuredText += `${header}: ${value}\n`;
          } else if (accountPattern.test(header)) {
            structuredText += `${header}: ${value}\n`;
          }
        }
      }
    }

    // Combine headers and structured data
    const fullText = lines.join("\n") + "\n\n" + structuredText;

    return {
      text: fullText,
      confidence: 1.0,
    };
  } catch (error) {
    console.error("Error parsing CSV file:", error);
    // Fallback to raw text
    const text = await readFile(filePath, "utf-8");
    return {
      text,
      confidence: 0.8, // Lower confidence due to parsing error
    };
  }
}

/**
 * Validate extracted date string
 */
function validateDate(dateString: string): { isValid: boolean; date?: Date; error?: string } {
  try {
    // Try multiple date formats
    const formats = [
      // "Jan 1, 2025"
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i,
      // "01/01/2025" or "01-01-2025"
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
      // ISO format
      /^\d{4}-\d{2}-\d{2}$/,
    ];

    let parsedDate: Date | null = null;

    for (const format of formats) {
      if (format.test(dateString.trim())) {
        parsedDate = new Date(dateString);
        if (!isNaN(parsedDate.getTime())) {
          // Validate date is reasonable (not too far in past/future)
          const now = new Date();
          const yearsDiff = Math.abs(now.getFullYear() - parsedDate.getFullYear());
          if (yearsDiff <= 10) {
            return { isValid: true, date: parsedDate };
          }
        }
      }
    }

    return {
      isValid: false,
      error: `Invalid date format: ${dateString}`,
    };
  } catch {
    return {
      isValid: false,
      error: `Failed to parse date: ${dateString}`,
    };
  }
}

/**
 * Validate extracted amount (currency)
 */
function validateAmount(amount: number): { isValid: boolean; error?: string } {
  if (isNaN(amount)) {
    return { isValid: false, error: "Amount is not a valid number" };
  }

  if (amount < 0) {
    return { isValid: false, error: "Amount cannot be negative" };
  }

  if (amount > 1000000) {
    return { isValid: false, error: "Amount exceeds maximum limit ($1,000,000)" };
  }

  return { isValid: true };
}

/**
 * Validate extracted usage values (kWh, kW)
 */
function validateUsage(usage: number, type: "kwh" | "kw"): { isValid: boolean; error?: string } {
  if (isNaN(usage)) {
    return { isValid: false, error: `${type.toUpperCase()} is not a valid number` };
  }

  if (usage < 0) {
    return { isValid: false, error: `${type.toUpperCase()} cannot be negative` };
  }

  const maxValue = type === "kwh" ? 1000000 : 100000; // 1M kWh or 100MW
  if (usage > maxValue) {
    return {
      isValid: false,
      error: `${type.toUpperCase()} exceeds maximum limit (${maxValue})`,
    };
  }

  return { isValid: true };
}

/**
 * Cross-field validation for bill data
 */
function validateBillDataCrossFields(data: ParsedBillData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate billing period dates
  if (data.billingPeriod?.start && data.billingPeriod?.end) {
    const startValidation = validateDate(data.billingPeriod.start);
    const endValidation = validateDate(data.billingPeriod.end);

    if (!startValidation.isValid) {
      errors.push(`Invalid billing period start date: ${startValidation.error}`);
    }
    if (!endValidation.isValid) {
      errors.push(`Invalid billing period end date: ${endValidation.error}`);
    }

    // Check if end date is after start date
    if (startValidation.date && endValidation.date) {
      if (endValidation.date < startValidation.date) {
        errors.push("Billing period end date must be after start date");
      }

      // Check if period is reasonable (1-90 days)
      const daysDiff = Math.ceil(
        (endValidation.date.getTime() - startValidation.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff < 1 || daysDiff > 90) {
        warnings.push(`Billing period is ${daysDiff} days (expected 1-90 days)`);
      }
    }
  }

  // Validate usage values
  if (data.usage?.kwh !== undefined) {
    const kwhValidation = validateUsage(data.usage.kwh, "kwh");
    if (!kwhValidation.isValid) {
      errors.push(kwhValidation.error!);
    }
  }

  if (data.usage?.kw !== undefined) {
    const kwValidation = validateUsage(data.usage.kw, "kw");
    if (!kwValidation.isValid) {
      errors.push(kwValidation.error!);
    }
  }

  // Validate charges
  if (data.charges?.total !== undefined) {
    const totalValidation = validateAmount(data.charges.total);
    if (!totalValidation.isValid) {
      errors.push(`Total charge: ${totalValidation.error}`);
    }
  }

  if (data.charges?.energyCharge !== undefined) {
    const energyValidation = validateAmount(data.charges.energyCharge);
    if (!energyValidation.isValid) {
      errors.push(`Energy charge: ${energyValidation.error}`);
    }
  }

  if (data.charges?.demandCharge !== undefined) {
    const demandValidation = validateAmount(data.charges.demandCharge);
    if (!demandValidation.isValid) {
      errors.push(`Demand charge: ${demandValidation.error}`);
    }
  }

  // Cross-field checks
  if (data.charges?.energyCharge && data.charges?.demandCharge && data.charges?.total) {
    const sum = (data.charges.energyCharge || 0) + (data.charges.demandCharge || 0);
    const total = data.charges.total;
    const diff = Math.abs(sum - total);
    
    // Allow 10% difference for taxes/fees
    if (diff > total * 0.1 && diff > 5) {
      warnings.push(
        `Sum of energy and demand charges ($${sum.toFixed(2)}) differs from total ($${total.toFixed(2)}) by $${diff.toFixed(2)}`
      );
    }
  }

  // Validate average daily usage calculation
  if (data.averageDailyUsage !== undefined) {
    if (data.averageDailyUsage < 0) {
      errors.push("Average daily usage cannot be negative");
    }
    if (data.averageDailyUsage > 10000) {
      warnings.push("Average daily usage is unusually high (>10,000 kWh/day)");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Fallback parsing strategies for edge cases
 */
function parseBillTextFallback(text: string): ParsedBillData {
  const data: ParsedBillData = {};

  // Strategy 1: Look for numbers with units in context
  const numberWithUnitPattern = /(\d+(?:,\d+)?(?:\.\d+)?)\s*(kWh|kW|kw|kilowatt|megawatt|MW|mw)/gi;
  const matches = [...text.matchAll(numberWithUnitPattern)];
  
  for (const match of matches) {
    const value = parseFloat(match[1].replace(/,/g, ""));
    const unit = match[2].toLowerCase();
    
    if (!isNaN(value) && value > 0) {
      if ((unit.includes("kwh") || unit.includes("kilowatt")) && !data.usage?.kwh) {
        if (!data.usage) data.usage = {};
        data.usage.kwh = value;
      } else if ((unit.includes("kw") || unit.includes("kilowatt")) && !data.usage?.kw) {
        if (!data.usage) data.usage = {};
        data.usage.kw = value;
      }
    }
  }

  // Strategy 2: Look for currency amounts
  const currencyPattern = /\$\s*(\d+(?:,\d+)?(?:\.\d{2})?)/gi;
  const currencyMatches = [...text.matchAll(currencyPattern)];
  if (currencyMatches.length > 0) {
    // Take the largest amount as total
    const amounts = currencyMatches
      .map((m) => parseFloat(m[1].replace(/,/g, "")))
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => b - a);
    
    if (amounts.length > 0 && !data.charges?.total) {
      if (!data.charges) data.charges = {};
      data.charges.total = amounts[0];
    }
  }

  // Strategy 3: Look for dates in various formats
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/gi,
  ];

  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const dateMatches = [...text.matchAll(pattern)];
    dates.push(...dateMatches.map((m) => m[1]));
  }

  if (dates.length >= 2 && !data.billingPeriod) {
    data.billingPeriod = {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }

  return data;
}

/**
 * Parse bill data from extracted text
 */
export interface ParsedBillData {
  utilityCompany?: string;
  accountNumber?: string;
  billingPeriod?: {
    start?: string;
    end?: string;
  };
  usage?: {
    kwh?: number;
    kw?: number;
  };
  charges?: {
    total?: number;
    energyCharge?: number;
    demandCharge?: number;
  };
  averageDailyUsage?: number;
  renewableSource?: {
    type?: string;
    capacity?: number;
    capacityUnit?: string;
  };
}

export function parseBillText(text: string): ParsedBillData {
  const data: ParsedBillData = {};

  // Normalize text for better matching
  const normalizedText = text.replace(/\s+/g, " ").trim();

  // Enhanced patterns for utility bills with multiple variations
  const patterns = {
    // kWh usage patterns - multiple variations
    kwh: [
      /total\s*kwh\s*used[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)/gi, // Georgia Power: "Total kWh Used"
      /total\s*(?:usage|consumption|kwh)[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi,
      /(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh\s*(?:used|consumed|total)/gi,
      /(?:current|this\s*month)\s*(?:usage|consumption)[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi,
      /electric\s*usage[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi,
      /kWh\s*delivered[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /usage\s*information[\s\S]*?total\s*used[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi, // Georgia Power usage section
      /(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi, // Fallback: any kWh value
    ],

    // Demand patterns - peak/max demand
    demand: [
      /(?:peak|maximum|max)\s*demand[:\s]*(\d+(?:\.\d+)?)\s*kW/gi,
      /demand[:\s]*(\d+(?:\.\d+)?)\s*kW/gi,
      /kW\s*demand[:\s]*(\d+(?:\.\d+)?)/gi,
    ],

    // Cost patterns - total amount due
    totalAmount: [
      /total\s*due[:\s]*\$\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi, // Georgia Power: "Total Due $ 144.00"
      /(?:total\s*amount|amount\s*due|balance\s*due|total\s*current\s*charges)[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /(?:new\s*charges|current\s*charges)[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /please\s*pay[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /current\s*(?:actual|electric\s*service)\s*amount[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi, // Georgia Power actual amount
    ],

    // Energy charge
    energyCharge: [
      /(?:energy|electricity)\s*charge[s]?[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /(?:usage|consumption)\s*charge[s]?[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
    ],

    // Demand charge
    demandCharge: [
      /demand\s*charge[s]?[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /(?:peak|maximum)\s*demand\s*charge[s]?[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
    ],

    // Account info - more flexible
    accountNumber: [
      /account\s*number[:\s]*(\d{5}-\d{5})/gi, // Georgia Power: "02608-44013"
      /account\s*(?:number|no|#)[:\s]*([A-Z0-9-]+)/gi,
      /acct[:\s]*([A-Z0-9-]+)/gi,
      /customer\s*(?:number|id)[:\s]*([A-Z0-9-]+)/gi,
    ],

    // Billing period - multiple date formats
    billingPeriod: [
      /service\s*period[:\s]*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})\s*-\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/gi, // Georgia Power: "Aug 29, 2025 - Sept 30, 2025"
      /(?:billing|service)\s*period[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|-|–)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(?:from|start)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|-|–)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|-|–)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
    ],

    // Utility companies - comprehensive list
    utility: [
      /(PG&E|Pacific\s*Gas\s*(?:and|&)\s*Electric)/gi,
      /(Duke\s*Energy)/gi,
      /(Southern\s*California\s*Edison|SCE)/gi,
      /(Con\s*Edison|ConEd)/gi,
      /(Georgia\s*Power)/gi,
      /(Florida\s*Power\s*(?:and|&)\s*Light|FPL)/gi,
      /(National\s*Grid)/gi,
      /(Ameren|AEP|Dominion|Exelon|FPL|PECO|ComEd)/gi,
      /(Xcel\s*Energy|NV\s*Energy|PSEG|APS|SRP)/gi,
    ],

    // Renewable energy source type patterns
    renewableType: [
      /(?:renewable|generation)\s*(?:source|type|energy)[:\s]*(solar|wind|hydro|geothermal|biomass)/gi,
      /(solar|wind|hydro|geothermal|biomass)\s*(?:panel|turbine|power|energy|system)/gi,
      /(?:installed|on-site)\s*(solar|wind|hydro|geothermal|biomass)/gi,
      /(solar|wind|hydro|geothermal|biomass)\s*(?:installation|array|farm)/gi,
    ],

    // Capacity patterns - kW/MW ratings
    capacity: [
      /(?:capacity|rated|nameplate)[:\s]*(\d+(?:\.\d+)?)\s*(kW|MW|kilowatt|megawatt)/gi,
      /(\d+(?:\.\d+)?)\s*(kW|MW|kilowatt|megawatt)\s*(?:capacity|system|installation)/gi,
      /(?:system\s*size|installed\s*capacity)[:\s]*(\d+(?:\.\d+)?)\s*(kW|MW|kilowatt|megawatt)/gi,
      /(\d+(?:\.\d+)?)\s*(kW|MW)\s*(?:solar|wind|hydro|geothermal|biomass)/gi,
    ],
  };

  // Helper function to try multiple patterns and return first match
  const tryPatterns = (patternArray: RegExp[], text: string): string | null => {
    for (const pattern of patternArray) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Helper function to extract all matches and find the most reasonable value
  const extractBestNumber = (
    patternArray: RegExp[],
    text: string,
    validation?: (n: number) => boolean,
  ): number | undefined => {
    const values: number[] = [];

    for (const pattern of patternArray) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const numValue = parseFloat(match[1].replace(/,/g, ""));
          if (!isNaN(numValue) && numValue > 0) {
            if (!validation || validation(numValue)) {
              values.push(numValue);
            }
          }
        }
      }
    }

    if (values.length === 0) return undefined;

    // If multiple values found, prefer the largest (usually the total)
    // unless it's unreasonably large
    values.sort((a, b) => b - a);
    return values[0];
  };

  // Extract utility company (try all patterns)
  for (const pattern of patterns.utility) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.utilityCompany = match[1].trim();
      break;
    }
  }

  // Extract account number
  const accountValue = tryPatterns(patterns.accountNumber, normalizedText);
  if (accountValue) {
    data.accountNumber = accountValue.trim();
  }

  // Extract billing period
  for (const pattern of patterns.billingPeriod) {
    const match = normalizedText.match(pattern);
    if (match && match[1] && match[2]) {
      data.billingPeriod = {
        start: match[1],
        end: match[2],
      };
      break;
    }
  }

  // Extract kWh usage (try all patterns, validate reasonable range)
  const kwhValue = extractBestNumber(
    patterns.kwh,
    normalizedText,
    (n) => n < 100000, // Sanity check: less than 100,000 kWh/month
  );

  // Extract demand (validate reasonable range)
  const demandValue = extractBestNumber(
    patterns.demand,
    normalizedText,
    (n) => n < 10000, // Sanity check: less than 10,000 kW
  );

  if (kwhValue || demandValue) {
    data.usage = {
      kwh: kwhValue,
      kw: demandValue,
    };
  }

  // Extract charges
  const totalCharge = extractBestNumber(
    patterns.totalAmount,
    normalizedText,
    (n) => n < 100000, // Sanity check: less than $100k
  );

  const energyChargeValue = extractBestNumber(
    patterns.energyCharge,
    normalizedText,
    (n) => n < 100000,
  );

  const demandChargeValue = extractBestNumber(
    patterns.demandCharge,
    normalizedText,
    (n) => n < 100000,
  );

  if (totalCharge || energyChargeValue || demandChargeValue) {
    data.charges = {
      total: totalCharge,
      energyCharge: energyChargeValue,
      demandCharge: demandChargeValue,
    };
  }

  // Calculate average daily usage if we have kWh and billing period
  if (kwhValue && data.billingPeriod?.start && data.billingPeriod?.end) {
    try {
      const start = new Date(data.billingPeriod.start);
      const end = new Date(data.billingPeriod.end);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days > 0) {
        data.averageDailyUsage = kwhValue / days;
      }
    } catch {
      // If date parsing fails, skip average calculation
    }
  }

  // Extract renewable energy source type
  const renewableType = tryPatterns(patterns.renewableType, normalizedText);

  // Extract capacity with unit
  let capacityValue: number | undefined;
  let capacityUnit: string | undefined;

  for (const pattern of patterns.capacity) {
    const matches = [...normalizedText.matchAll(pattern)];
    for (const match of matches) {
      if (match[1] && match[2]) {
        const rawCapacity = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        if (!isNaN(rawCapacity) && rawCapacity > 0) {
          // Convert MW to kW for consistency
          if (unit.startsWith('mw') || unit === 'megawatt') {
            capacityValue = rawCapacity * 1000;
            capacityUnit = 'kW';
          } else {
            capacityValue = rawCapacity;
            capacityUnit = 'kW';
          }
          break;
        }
      }
    }
    if (capacityValue) break;
  }

  // Add renewable source data if found
  if (renewableType || capacityValue) {
    data.renewableSource = {
      type: renewableType?.toLowerCase().trim(),
      capacity: capacityValue,
      capacityUnit: capacityUnit,
    };
  }

  // Validate extracted data
  const validation = validateBillDataCrossFields(data);
  
  // If primary parsing found minimal data, try fallback strategies
  const hasMinimalData =
    data.usage?.kwh ||
    data.usage?.kw ||
    data.charges?.total ||
    data.billingPeriod?.start;

  if (!hasMinimalData && text.length > 100) {
    // Try fallback parsing
    const fallbackData = parseBillTextFallback(text);
    
    // Merge fallback data (only if primary didn't find it)
    if (!data.usage?.kwh && fallbackData.usage?.kwh) {
      if (!data.usage) data.usage = {};
      data.usage.kwh = fallbackData.usage.kwh;
    }
    if (!data.usage?.kw && fallbackData.usage?.kw) {
      if (!data.usage) data.usage = {};
      data.usage.kw = fallbackData.usage.kw;
    }
    if (!data.charges?.total && fallbackData.charges?.total) {
      if (!data.charges) data.charges = {};
      data.charges.total = fallbackData.charges.total;
    }
    if (!data.billingPeriod && fallbackData.billingPeriod) {
      data.billingPeriod = fallbackData.billingPeriod;
    }
  }

  // Re-validate after fallback merge
  const finalValidation = validateBillDataCrossFields(data);
  
  // Log validation results
  if (finalValidation.errors.length > 0) {
    console.warn("Bill data validation errors:", finalValidation.errors);
  }
  if (finalValidation.warnings.length > 0) {
    console.info("Bill data validation warnings:", finalValidation.warnings);
  }

  return data;
}

/**
 * Validation result for renewable energy source data
 */
export interface RenewableSourceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates renewable energy source data
 *
 * @param renewableSource - The renewable source object to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const validation = validateRenewableSource({
 *   type: 'solar',
 *   capacity: 5000,
 *   capacityUnit: 'kW'
 * });
 *
 * if (!validation.isValid) {
 *   console.error('Validation failed:', validation.errors);
 * }
 * ```
 */
export function validateRenewableSource(
  renewableSource?: {
    type?: string;
    capacity?: number;
    capacityUnit?: string;
  }
): RenewableSourceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if renewable source exists
  if (!renewableSource) {
    return {
      isValid: true,
      errors: [],
      warnings: ['No renewable source data provided'],
    };
  }

  // Valid renewable types
  const validTypes = ['solar', 'wind', 'hydro', 'geothermal', 'biomass'];

  // Validate type
  if (renewableSource.type) {
    const normalizedType = renewableSource.type.toLowerCase().trim();
    if (!validTypes.includes(normalizedType)) {
      errors.push(
        `Invalid renewable type: "${renewableSource.type}". Must be one of: ${validTypes.join(', ')}`
      );
    }
  } else {
    warnings.push('Renewable source type not specified');
  }

  // Validate capacity
  if (renewableSource.capacity !== undefined) {
    if (renewableSource.capacity <= 0) {
      errors.push('Capacity must be greater than 0');
    } else if (renewableSource.capacity > 100000) {
      errors.push('Capacity exceeds maximum limit of 100,000 kW');
    }

    // Warning for unusually small systems
    if (renewableSource.capacity < 1) {
      warnings.push('Capacity is unusually small (< 1 kW)');
    }

    // Warning for very large systems
    if (renewableSource.capacity > 10000) {
      warnings.push('Capacity is very large (> 10 MW) - utility-scale installation');
    }
  } else {
    warnings.push('Capacity not specified');
  }

  // Validate unit
  if (renewableSource.capacityUnit) {
    const validUnits = ['kW', 'kw', 'kilowatt', 'kilowatts'];
    if (!validUnits.includes(renewableSource.capacityUnit.toLowerCase())) {
      warnings.push(
        `Unusual capacity unit: "${renewableSource.capacityUnit}". Expected kW.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Capacity calculation result
 */
export interface CapacityCalculation {
  sourceType: string;
  nameplateCapacityKw: number;
  capacityFactor: number;
  effectiveCapacityKw: number;
  annualProductionKwh: number;
}

/**
 * Calculates effective capacity and annual production for renewable energy sources
 *
 * Uses industry-standard capacity factors for different renewable types:
 * - Solar: 20% (varies by location and system design)
 * - Wind: 35% (onshore average)
 * - Hydro: 50% (run-of-river systems)
 * - Geothermal: 80% (baseload systems)
 * - Biomass: 70% (dispatchable generation)
 *
 * @param sourceType - Type of renewable energy source
 * @param nameplateCapacityKw - Rated capacity in kilowatts
 * @param customCapacityFactor - Optional custom capacity factor (0-1)
 * @returns Capacity calculation with effective capacity and annual production
 *
 * @example
 * ```typescript
 * const calc = calculateCapacity('solar', 5000);
 * console.log(`Annual production: ${calc.annualProductionKwh} kWh`);
 * // Output: Annual production: 8760000 kWh
 * ```
 *
 * @example
 * ```typescript
 * // With custom capacity factor for high-efficiency solar
 * const calc = calculateCapacity('solar', 5000, 0.25);
 * console.log(`Effective capacity: ${calc.effectiveCapacityKw} kW`);
 * // Output: Effective capacity: 1250 kW
 * ```
 */
export function calculateCapacity(
  sourceType: string,
  nameplateCapacityKw: number,
  customCapacityFactor?: number
): CapacityCalculation {
  // Default capacity factors by source type
  const capacityFactors: Record<string, number> = {
    solar: 0.20,
    wind: 0.35,
    hydro: 0.50,
    geothermal: 0.80,
    biomass: 0.70,
  };

  // Get capacity factor (use custom if provided, otherwise use default)
  const normalizedType = sourceType.toLowerCase().trim();
  let capacityFactor: number;

  if (customCapacityFactor !== undefined) {
    // Validate custom capacity factor
    if (customCapacityFactor < 0 || customCapacityFactor > 1) {
      throw new Error('Capacity factor must be between 0 and 1');
    }
    capacityFactor = customCapacityFactor;
  } else {
    capacityFactor = capacityFactors[normalizedType] || 0.20; // Default to solar
  }

  // Calculate effective capacity
  const effectiveCapacityKw = nameplateCapacityKw * capacityFactor;

  // Calculate annual production (hours per year = 8760)
  const annualProductionKwh = effectiveCapacityKw * 8760;

  return {
    sourceType: normalizedType,
    nameplateCapacityKw,
    capacityFactor,
    effectiveCapacityKw,
    annualProductionKwh,
  };
}
