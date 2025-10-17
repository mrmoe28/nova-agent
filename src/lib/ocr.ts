import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import Anthropic from '@anthropic-ai/sdk'
// Dynamic import for Tesseract to avoid serverless environment issues
// pdf-parse needs to be loaded via CommonJS require

export interface OCRResult {
  text: string
  confidence?: number
  pageCount?: number
}

/**
 * Extract text and structured data from PDF using Claude AI
 * This provides the most accurate extraction with intelligent parsing
 */
export async function extractTextWithClaude(filePath: string): Promise<OCRResult> {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Read PDF file as buffer
    const pdfBuffer = await readFile(filePath)
    const base64Pdf = pdfBuffer.toString('base64')

    console.log('Using Claude AI for PDF extraction...')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: 'Please extract ALL text content from this utility bill PDF. Return the complete text exactly as it appears in the document, preserving formatting, numbers, and structure. Do not summarize or interpret - just extract the raw text.',
            },
          ],
        },
      ],
    })

    const extractedText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n')

    console.log(`Claude extraction complete: ${extractedText.length} characters`)

    return {
      text: extractedText,
      confidence: 0.98, // Claude's accuracy is very high
      pageCount: 1,
    }
  } catch (error) {
    console.error('Claude PDF extraction failed:', error)
    throw new Error(`Claude extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract text from PDF file using pdf-parse (most reliable fallback)
 * Fallback method if Claude is unavailable
 */
export async function extractTextFromPDF(filePath: string): Promise<OCRResult> {
  try {
    const dataBuffer = await readFile(filePath)

    // Use CommonJS require for pdf-parse (ESM compatibility)
    const require = createRequire(import.meta.url)
    const pdfParse = require('pdf-parse')

    // Parse PDF using pdf-parse
    const pdfData = await pdfParse(dataBuffer)

    return {
      text: pdfData.text,
      pageCount: pdfData.numpages,
      confidence: 0.95, // PDF text extraction is usually highly accurate
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
 * Uses Claude AI for PDFs when available, falls back to traditional OCR
 */
export async function performOCR(
  filePath: string,
  fileType: 'pdf' | 'image' | 'csv'
): Promise<OCRResult> {
  if (fileType === 'pdf') {
    // Try Claude AI extraction first (most accurate)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log('Attempting Claude AI PDF extraction...')
        return await extractTextWithClaude(filePath)
      } catch (claudeError) {
        console.warn('Claude extraction failed, falling back to unpdf:', claudeError)
        // Fall back to traditional PDF extraction
        return extractTextFromPDF(filePath)
      }
    } else {
      console.log('No ANTHROPIC_API_KEY found, using unpdf for PDF extraction')
      return extractTextFromPDF(filePath)
    }
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
      /total\s*kwh\s*used[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)/gi,  // Georgia Power: "Total kWh Used"
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
