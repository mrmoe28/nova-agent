// Simple CommonJS test
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/ekodevapps/Documents/PowerBills/Dr. Coleman/Bill (1).PDF');

const parser = new PDFParse();
parser.parse(dataBuffer).then(function(data) {
  console.log('✅ Success!');
  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length);
  console.log('First 500 chars:', data.text.substring(0, 500));
}).catch(function(error){
  console.error('❌ Error:', error);
});
