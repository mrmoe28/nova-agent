// Quick digital-PDF extractor via pdf-parse
// Usage: npm run parse-pdf ./path/to/file.pdf

const fs = require("fs");
const pdf = require("pdf-parse");

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run parse-pdf <pdf-file>");
    process.exit(1);
  }
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);

  const out = {
    file: filePath,
    pages: data.numpages,
    textPreview: data.text.slice(0, 2000), // preview
    metadata: data.metadata || {},
    info: data.info || {},
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error("parsePDF error:", err);
  process.exit(1);
});
