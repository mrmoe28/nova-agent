// Quick test script for OCR extraction
import dotenv from 'dotenv'
import { performOCR, parseBillText } from './src/lib/ocr'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

async function testOCR() {
  const testFile = '/Users/ekodevapps/Documents/PowerBills/Dr. Coleman/Bill (1).PDF'

  console.log('Testing OCR extraction...')
  console.log('File:', testFile)
  console.log('---')

  try {
    const result = await performOCR(testFile, 'pdf')

    console.log('✅ Extraction successful!')
    console.log(`Text length: ${result.text.length} characters`)
    console.log(`Confidence: ${(result.confidence! * 100).toFixed(1)}%`)
    console.log('---')
    console.log('Extracted text (first 500 chars):')
    console.log(result.text.substring(0, 500))
    console.log('---')

    // Parse the bill
    const parsed = parseBillText(result.text)
    console.log('\n📊 Parsed Bill Data:')
    console.log(JSON.stringify(parsed, null, 2))

  } catch (error) {
    console.error('❌ Extraction failed:', error)
  }
}

testOCR()
