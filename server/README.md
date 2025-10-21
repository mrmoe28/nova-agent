# NovaAgent OCR Microservice

Production-ready OCR service for extracting text from power bills (PDF and images).

## Features

- **Born-digital PDFs**: Fast extraction with PyMuPDF (no OCR needed)
- **Scanned PDFs**: Rasterize → PaddleOCR (preferred) → Tesseract (fallback)
- **Images**: Direct OCR with PaddleOCR or Tesseract
- **Table Extraction**: Best-effort table detection with pdfplumber (digital PDFs)
- **Confidence Scores**: Per-word and average confidence metrics
- **Structured Output**: Returns text, blocks (with bounding boxes), tables, and metadata

## Prerequisites

### System Dependencies

#### macOS
```bash
# Install Tesseract OCR engine
brew install tesseract

# Install Python 3.11+
brew install python@3.11
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr python3 python3-pip
```

### Python Dependencies
```bash
# Navigate to project root
cd /Users/ekodevapps/Desktop/NovaAgent/novaagent

# Install Python dependencies
pip3 install -r server/requirements.txt

# Optional: Install PaddleOCR for better accuracy (requires more setup)
pip3 install paddlepaddle paddleocr
```

## Running the Service

### Development Mode
```bash
# Start the OCR service on port 8001
python3 server/ocr_service.py

# Or with custom port
OCR_PORT=8002 python3 server/ocr_service.py
```

### Production Mode
```bash
# Run with Uvicorn (production ASGI server)
uvicorn server.ocr_service:app --host 0.0.0.0 --port 8001 --workers 4
```

### Health Check
```bash
# Check if service is running
curl http://localhost:8001/health

# Expected response:
# {"ok":true,"paddle":false,"tesseract":true,"pdfplumber":true}
```

## API Endpoints

### `POST /extract`

Extract text, blocks, and tables from a PDF or image file.

**Request:**
```bash
curl -X POST http://localhost:8001/extract \
  -F "file=@/path/to/bill.pdf" \
  -F "want_tables=true"
```

**Response:**
```json
{
  "file_name": "bill.pdf",
  "mime_type": "application/pdf",
  "pages": 2,
  "is_digital_pdf": true,
  "text": "Georgia Power Company...",
  "blocks": [
    {
      "text": "Georgia",
      "confidence": 1.0,
      "bbox": [100.5, 200.3, 180.2, 220.1],
      "page": 1
    }
  ],
  "tables": [
    {
      "page": 1,
      "rows": [
        ["Date", "Usage", "Cost"],
        ["Jan", "1200 kWh", "$156.78"]
      ],
      "strategy": "pdfplumber"
    }
  ],
  "metadata": {
    "engine": "pymupdf"
  }
}
```

### `GET /health`

Check service health and available OCR engines.

**Response:**
```json
{
  "ok": true,
  "paddle": false,
  "tesseract": true,
  "pdfplumber": true
}
```

## Integration with Next.js

The Next.js app automatically calls the OCR microservice during file upload:

1. User uploads bill → `/api/upload`
2. Next.js saves file to `/tmp/uploads/{projectId}/`
3. Next.js calls OCR microservice: `http://localhost:8001/extract`
4. OCR service extracts text + tables
5. Next.js parses extracted data and saves to database

### Environment Variables

Add to `.env.local`:
```bash
# OCR Microservice URL (defaults to http://localhost:8001)
OCR_SERVICE_URL=http://localhost:8001
```

## Testing

### Test with Sample PDF
```bash
# Test PDF extraction
curl -X POST http://localhost:8001/extract \
  -F "file=@/Users/ekodevapps/Documents/PowerBills/Dr. Coleman/Bill (1).PDF" \
  | jq .

# Test with Node.js parser utility
npm run parse-pdf "/Users/ekodevapps/Documents/PowerBills/Dr. Coleman/Bill (1).PDF"
```

### Full Upload Test
```bash
# Make sure both services are running:
# Terminal 1: python3 server/ocr_service.py
# Terminal 2: npm run dev

# Run upload test
node test-bill-upload.js
```

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│  (Port 3000)    │
└────────┬────────┘
         │ HTTP POST /extract
         │ (FormData with file)
         ▼
┌─────────────────┐
│  Python FastAPI │
│  OCR Service    │
│  (Port 8001)    │
├─────────────────┤
│ • PyMuPDF       │ ← Digital PDF text
│ • PaddleOCR     │ ← Scanned PDF/Image OCR (preferred)
│ • Tesseract     │ ← Fallback OCR
│ • pdfplumber    │ ← Table extraction
└─────────────────┘
```

## Troubleshooting

### Issue: "OCR microservice is not running"
**Solution**: Start the OCR service:
```bash
python3 server/ocr_service.py
```

### Issue: "Tesseract not found"
**Solution**: Install Tesseract:
```bash
brew install tesseract  # macOS
sudo apt-get install tesseract-ocr  # Linux
```

### Issue: "No module named 'fitz'"
**Solution**: Install PyMuPDF:
```bash
pip3 install pymupdf
```

### Issue: Low OCR accuracy
**Solution**: Install PaddleOCR for better accuracy:
```bash
pip3 install paddlepaddle paddleocr
```

## Performance

- **Digital PDFs**: ~100ms per page (PyMuPDF)
- **Scanned PDFs**: ~2-5s per page (Tesseract), ~1-3s (PaddleOCR)
- **Images**: ~1-4s per image (depends on resolution)

## Production Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y tesseract-ocr
WORKDIR /app
COPY server/requirements.txt .
RUN pip install -r requirements.txt
COPY server/ .
EXPOSE 8001
CMD ["python", "ocr_service.py"]
```

Build and run:
```bash
docker build -t novaagent-ocr .
docker run -p 8001:8001 novaagent-ocr
```

### Systemd Service (Linux)
```ini
[Unit]
Description=NovaAgent OCR Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/novaagent
ExecStart=/usr/bin/python3 server/ocr_service.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## License

MIT
