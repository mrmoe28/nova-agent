# Simplified FastAPI OCR service for NovaAgent
# Works with available packages (no PyMuPDF dependency)

import io
import os
from typing import List, Optional, Any, Dict

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# Tesseract OCR
try:
    import pytesseract
    from PIL import Image
    TESSERACT_OK = True
except Exception:
    TESSERACT_OK = False

app = FastAPI(title="NovaAgent Simple OCR Service", version="1.0.0")

class ExtractResponse(BaseModel):
    file_name: str
    mime_type: str
    pages: int
    is_digital_pdf: Optional[bool]
    text: str
    blocks: List[Dict[str, Any]]
    tables: List[Dict[str, Any]]
    metadata: Dict[str, Any]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "simple-ocr",
        "tesseract_available": TESSERACT_OK
    }

def _ocr_image_tesseract(img: Image.Image) -> List[Dict[str, Any]]:
    """Extract text from image using Tesseract"""
    if not TESSERACT_OK:
        return []
    
    try:
        # Get text with bounding boxes
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        blocks = []
        
        for i in range(len(data['text'])):
            text = data['text'][i].strip()
            if text:
                block = {
                    "text": text,
                    "bbox": [
                        data['left'][i],
                        data['top'][i], 
                        data['left'][i] + data['width'][i],
                        data['top'][i] + data['height'][i]
                    ],
                    "confidence": data['conf'][i] / 100.0,
                    "page": 1
                }
                blocks.append(block)
        
        return blocks
    except Exception as e:
        print(f"Tesseract OCR error: {e}")
        return []

def _merge_blocks_to_text(blocks: List[Dict[str, Any]]) -> str:
    """Merge text blocks into a single string"""
    return '\n'.join(block.get('text', '') for block in blocks if block.get('text', '').strip())

@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    """Extract text from uploaded file"""
    if not file:
        return JSONResponse(status_code=400, content={"error": "No file provided"})
    
    fname = file.filename or "unknown"
    mime = file.content_type or "application/octet-stream"
    
    try:
        file_bytes = await file.read()
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Failed to read file: {str(e)}"})
    
    # Handle images
    if mime.startswith("image/"):
        if not TESSERACT_OK:
            return JSONResponse(status_code=500, content={"error": "Tesseract OCR not available"})
        
        try:
            img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            blocks = _ocr_image_tesseract(img)
            text = _merge_blocks_to_text(blocks)
            
            response = ExtractResponse(
                file_name=fname,
                mime_type=mime,
                pages=1,
                is_digital_pdf=None,
                text=text,
                blocks=blocks,
                tables=[],
                metadata={"engine": "tesseract"}
            )
            return JSONResponse(response.dict())
            
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"OCR processing failed: {str(e)}"})
    
    # Handle PDFs (basic support without PyMuPDF)
    elif mime == "application/pdf":
        return JSONResponse(status_code=501, content={
            "error": "PDF processing not available (PyMuPDF not installed)",
            "suggestion": "Use image conversion or install PyMuPDF"
        })
    
    else:
        return JSONResponse(status_code=400, content={"error": f"Unsupported file type: {mime}"})

if __name__ == "__main__":
    # Run: python3 server/simple_ocr_service.py
    port = int(os.getenv("OCR_PORT", "8001"))
    print(f"Starting Simple OCR Service on port {port}")
    print(f"Tesseract available: {TESSERACT_OK}")
    uvicorn.run(app, host="0.0.0.0", port=port)
