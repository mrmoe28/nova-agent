import { readFile } from 'fs/promises'
import { extractText, getDocumentProxy } from 'unpdf'
// Dynamic import for Tesseract to avoid serverless environment issues

export interface OCRResult {
  text: string
  confidence?: number
  pageCount?: number
}

/**
 * Extract text from PDF file using unpdf (serverless-compatible)
 */
export async function extractTextFromPDF(filePath: string): Promise<OCRResult> {
  try {
    const dataBuffer = await readFile(filePath)

    // Get document proxy to count pages
    const pdf = await getDocumentProxy(dataBuffer)
    const pageCount = pdf.numPages

    // Extract all text from the PDF
    const { text } = await extractText(dataBuffer, { mergePages: true })

    return {
      text,
      pageCount,
      confidence: 0.95, // PDF text extraction is usually highly accurate
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Extract text from image file using OCR
 * Note: OCR is disabled in serverless environments due to canvas dependency issues
 */
export async function extractTextFromImage(filePath: string): Promise<OCRResult> {
  try {
    // Check if we're in a serverless environment (Vercel, Lambda, etc.)
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

    if (isServerless) {
      console.warn('OCR disabled in serverless environment - canvas/DOMMatrix not available')
      return {
        text: 'OCR unavailable in serverless environment. Please use PDF files or implement external OCR API.',
        confidence: 0,
      }
    }

    // Dynamic import to avoid loading Tesseract in serverless environments
    const Tesseract = await import('tesseract.js')

    const result = await Tesseract.default.recognize(filePath, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`)
        }
      },
    })

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Convert to 0-1 scale
    }
  } catch (error) {
    console.error('Error extracting text from image:', error)
    // Return empty result instead of throwing to prevent endpoint crash
    return {
      text: `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please use PDF files for better results.`,
      confidence: 0,
    }
  }
}

/**
 * Main OCR function that handles different file types
 */
export async function performOCR(
  filePath: string,
  fileType: 'pdf' | 'image' | 'csv'
): Promise<OCRResult> {
  if (fileType === 'pdf') {
    return extractTextFromPDF(filePath)
  } else if (fileType === 'image') {
    return extractTextFromImage(filePath)
  } else if (fileType === 'csv') {
    // For CSV, just read the file directly
    const text = await readFile(filePath, 'utf-8')
    return {
      text,
      confidence: 1.0,
    }
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}

/**
 * Parse bill data from extracted text
 */
export interface ParsedBillData {
  utilityCompany?: string
  accountNumber?: string
  billingPeriod?: {
    start?: string
    end?: string
  }
  usage?: {
    kwh?: number
    kw?: number
  }
  charges?: {
    total?: number
    energyCharge?: number
    demandCharge?: number
  }
  averageDailyUsage?: number
}

export function parseBillText(text: string): ParsedBillData {
  const data: ParsedBillData = {}

  // Normalize text for better matching
  const normalizedText = text.replace(/\s+/g, ' ').trim()

  // Enhanced patterns for utility bills with multiple variations
  const patterns = {
    // kWh usage patterns - multiple variations
    kwh: [
      /total\s*(?:usage|consumption|kwh)[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi,
      /(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh\s*(?:used|consumed|total)/gi,
      /(?:current|this\s*month)\s*(?:usage|consumption)[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi,
      /electric\s*usage[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh/gi,
      /kWh\s*delivered[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
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
      /(?:total\s*amount|amount\s*due|total\s*due|balance\s*due|total\s*current\s*charges)[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /(?:new\s*charges|current\s*charges)[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
      /please\s*pay[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/gi,
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
      /account\s*(?:number|no|#)[:\s]*([A-Z0-9-]+)/gi,
      /acct[:\s]*([A-Z0-9-]+)/gi,
      /customer\s*(?:number|id)[:\s]*([A-Z0-9-]+)/gi,
    ],

    // Billing period - multiple date formats
    billingPeriod: [
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
  }

  // Helper function to try multiple patterns and return first match
  const tryPatterns = (patternArray: RegExp[], text: string): string | null => {
    for (const pattern of patternArray) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  // Helper function to extract all matches and find the most reasonable value
  const extractBestNumber = (patternArray: RegExp[], text: string, validation?: (n: number) => boolean): number | undefined => {
    const values: number[] = []

    for (const pattern of patternArray) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        if (match[1]) {
          const numValue = parseFloat(match[1].replace(/,/g, ''))
          if (!isNaN(numValue) && numValue > 0) {
            if (!validation || validation(numValue)) {
              values.push(numValue)
            }
          }
        }
      }
    }

    if (values.length === 0) return undefined

    // If multiple values found, prefer the largest (usually the total)
    // unless it's unreasonably large
    values.sort((a, b) => b - a)
    return values[0]
  }

  // Extract utility company (try all patterns)
  for (const pattern of patterns.utility) {
    const match = normalizedText.match(pattern)
    if (match && match[1]) {
      data.utilityCompany = match[1].trim()
      break
    }
  }

  // Extract account number
  const accountValue = tryPatterns(patterns.accountNumber, normalizedText)
  if (accountValue) {
    data.accountNumber = accountValue.trim()
  }

  // Extract billing period
  for (const pattern of patterns.billingPeriod) {
    const match = normalizedText.match(pattern)
    if (match && match[1] && match[2]) {
      data.billingPeriod = {
        start: match[1],
        end: match[2],
      }
      break
    }
  }

  // Extract kWh usage (try all patterns, validate reasonable range)
  const kwhValue = extractBestNumber(
    patterns.kwh,
    normalizedText,
    (n) => n < 100000 // Sanity check: less than 100,000 kWh/month
  )

  // Extract demand (validate reasonable range)
  const demandValue = extractBestNumber(
    patterns.demand,
    normalizedText,
    (n) => n < 10000 // Sanity check: less than 10,000 kW
  )

  if (kwhValue || demandValue) {
    data.usage = {
      kwh: kwhValue,
      kw: demandValue,
    }
  }

  // Extract charges
  const totalCharge = extractBestNumber(
    patterns.totalAmount,
    normalizedText,
    (n) => n < 100000 // Sanity check: less than $100k
  )

  const energyChargeValue = extractBestNumber(
    patterns.energyCharge,
    normalizedText,
    (n) => n < 100000
  )

  const demandChargeValue = extractBestNumber(
    patterns.demandCharge,
    normalizedText,
    (n) => n < 100000
  )

  if (totalCharge || energyChargeValue || demandChargeValue) {
    data.charges = {
      total: totalCharge,
      energyCharge: energyChargeValue,
      demandCharge: demandChargeValue,
    }
  }

  // Calculate average daily usage if we have kWh and billing period
  if (kwhValue && data.billingPeriod?.start && data.billingPeriod?.end) {
    try {
      const start = new Date(data.billingPeriod.start)
      const end = new Date(data.billingPeriod.end)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (days > 0) {
        data.averageDailyUsage = kwhValue / days
      }
    } catch {
      // If date parsing fails, skip average calculation
    }
  }

  return data
}
