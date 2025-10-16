import { readFile } from 'fs/promises'
import { PDFParse } from 'pdf-parse'
import Tesseract from 'tesseract.js'

export interface OCRResult {
  text: string
  confidence?: number
  pageCount?: number
}

/**
 * Extract text from PDF file using pdf-parse
 */
export async function extractTextFromPDF(filePath: string): Promise<OCRResult> {
  try {
    const dataBuffer = await readFile(filePath)
    const parser = new PDFParse({ data: dataBuffer })
    const textResult = await parser.getText()

    return {
      text: textResult.text,
      pageCount: textResult.total,
      confidence: 0.95, // PDF text extraction is usually highly accurate
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Extract text from image file using OCR
 */
export async function extractTextFromImage(filePath: string): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(filePath, 'eng', {
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
    throw new Error('Failed to extract text from image')
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

  // Common patterns for utility bills
  const patterns = {
    // kWh usage patterns
    kwh: /(\d+(?:,\d+)?)\s*kWh/i,
    totalKwh: /total\s*(?:usage|consumption)[:\s]*(\d+(?:,\d+)?)\s*kWh/i,

    // Demand patterns
    demand: /(?:peak\s*)?demand[:\s]*(\d+(?:\.\d+)?)\s*kW/i,

    // Cost patterns
    totalAmount: /(?:total\s*amount|amount\s*due|balance\s*due)[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/i,
    energyCharge: /energy\s*charge[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)/i,

    // Account info
    accountNumber: /account\s*(?:number|#)[:\s]*(\w+)/i,

    // Billing period
    billingPeriod: /(?:billing|service)\s*period[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:to|-)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,

    // Utility company (common names)
    utility: /(PG&E|Duke Energy|Southern California Edison|SCE|Con Edison|Pacific Gas|Georgia Power|Florida Power|National Grid)/i,
  }

  // Extract utility company
  const utilityMatch = text.match(patterns.utility)
  if (utilityMatch) {
    data.utilityCompany = utilityMatch[1]
  }

  // Extract account number
  const accountMatch = text.match(patterns.accountNumber)
  if (accountMatch) {
    data.accountNumber = accountMatch[1]
  }

  // Extract billing period
  const periodMatch = text.match(patterns.billingPeriod)
  if (periodMatch) {
    data.billingPeriod = {
      start: periodMatch[1],
      end: periodMatch[2],
    }
  }

  // Extract kWh usage (try multiple patterns)
  let kwhValue: number | undefined
  const totalKwhMatch = text.match(patterns.totalKwh)
  if (totalKwhMatch) {
    kwhValue = parseFloat(totalKwhMatch[1].replace(/,/g, ''))
  } else {
    const kwhMatch = text.match(patterns.kwh)
    if (kwhMatch) {
      kwhValue = parseFloat(kwhMatch[1].replace(/,/g, ''))
    }
  }

  // Extract demand
  const demandMatch = text.match(patterns.demand)
  let demandValue: number | undefined
  if (demandMatch) {
    demandValue = parseFloat(demandMatch[1])
  }

  if (kwhValue || demandValue) {
    data.usage = {
      kwh: kwhValue,
      kw: demandValue,
    }
  }

  // Extract charges
  const totalMatch = text.match(patterns.totalAmount)
  const energyMatch = text.match(patterns.energyCharge)

  if (totalMatch || energyMatch) {
    data.charges = {
      total: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : undefined,
      energyCharge: energyMatch ? parseFloat(energyMatch[1].replace(/,/g, '')) : undefined,
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
