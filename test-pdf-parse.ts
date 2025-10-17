// Test pdf-parse directly (no Claude API)
import dotenv from 'dotenv'
import { extractTextFromPDF, parseBillText } from './src/lib/ocr'

dotenv.config({ path: '.env.local' })

async function testPdfParse() {
  const testFile = '/Users/ekodevapps/Documents/PowerBills/Dr. Coleman/Bill (1).PDF'

  console.log('Testing pdf-parse extraction (no Claude API)...')
  console.log('File:', testFile)
  console.log('---')

  try {
    // Call pdf-parse directly (bypassing Claude)
    const result = await extractTextFromPDF(testFile)

    console.log('✅ Extraction successful!')
    console.log(`Text length: ${result.text.length} characters`)
    console.log(`Confidence: ${(result.confidence! * 100).toFixed(1)}%`)
    console.log(`Pages: ${result.pageCount}`)
    console.log('---')
    console.log('Extracted text (first 800 chars):')
    console.log(result.text.substring(0, 800))
    console.log('---')

    // Parse the bill
    const parsed = parseBillText(result.text)
    console.log('\n📊 Parsed Bill Data:')
    console.log(JSON.stringify(parsed, null, 2))

  } catch (error) {
    console.error('❌ Extraction failed:', error)
  }
}

testPdfParse()
