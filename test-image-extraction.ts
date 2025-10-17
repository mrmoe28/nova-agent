/**
 * Test script to debug BrowserQL image extraction
 * Run with: npx tsx test-image-extraction.ts
 */

import { BrowserScraperBQL } from './src/lib/browser-scraper-bql'

async function testImageExtraction() {
  const testUrl = 'https://www.res-supply.com/axitec-ac-580tgb-144ts-bifacial-solar-panel-1110-002'

  console.log('🔍 Testing BrowserQL image extraction')
  console.log('URL:', testUrl)
  console.log('---')

  try {
    const scraper = new BrowserScraperBQL()

    // Test 1: Check fetchHTMLWithImage method
    console.log('\n📦 Test 1: Fetching HTML with image URL')
    const { html, imageUrl } = await scraper.fetchHTMLWithImage(testUrl)

    console.log('✅ HTML Length:', html.length)
    console.log('✅ Image URL:', imageUrl || 'NULL')
    console.log('---')

    // Test 2: Check full product scrape
    console.log('\n📦 Test 2: Full product scrape')
    const product = await scraper.scrapeProductPage(testUrl)

    console.log('✅ Product Name:', product.name || 'NULL')
    console.log('✅ Product Price:', product.price || 'NULL')
    console.log('✅ Product Image URL:', product.imageUrl || 'NULL')
    console.log('✅ Product Model:', product.modelNumber || 'NULL')
    console.log('---')

    // Test 3: Extract sample of HTML to check for image tags
    console.log('\n📦 Test 3: HTML Analysis')
    const imgTagMatches = html.match(/<img[^>]+>/gi)
    console.log('Total <img> tags found:', imgTagMatches?.length || 0)

    if (imgTagMatches && imgTagMatches.length > 0) {
      console.log('\nFirst 3 <img> tags:')
      imgTagMatches.slice(0, 3).forEach((tag, i) => {
        console.log(`${i + 1}. ${tag.substring(0, 150)}...`)
      })
    }

    // Test 4: Check for meta tags
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*>/i)
    if (ogImageMatch) {
      console.log('\n🖼️  Found og:image meta tag:')
      console.log(ogImageMatch[0])
    } else {
      console.log('\n❌ No og:image meta tag found')
    }

    console.log('\n✅ Test completed!')

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack)
    }
  }
}

testImageExtraction()
