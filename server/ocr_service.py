# FastAPI OCR + PDF parser for NovaAgent
# - Born-digital PDFs -> extract with PyMuPDF (fast, no OCR)
# - Scanned PDFs -> rasterize -> PaddleOCR (if available) -> pytesseract fallback
# - Images -> OCR directly
# - Returns unified JSON with blocks, tables (best-effort), metadata, and per-field confidences

import io
import os
import sys
import math
import tempfile
from typing import List, Optional, Any, Dict

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# ---- Optional imports (handled gracefully) ----
try:
    import fitz  # PyMuPDF
except Exception as e:
    raise RuntimeError("PyMuPDF (fitz) is required: pip install pymupdf") from e

# PaddleOCR is optional (preferred OCR)
PADDLE_OK = True
try:
    from paddleocr import PaddleOCR
    _paddle_singleton = None
except Exception:
    PADDLE_OK = False
    _paddle_singleton = None

# Tesseract fallback
TESSERACT_OK = True
try:
    import pytesseract
    from PIL import Image
except Exception:
    TESSERACT_OK = False

# Optional table extraction with pdfplumber (born-digital only best-effort)
PLUMBER_OK = True
try:
    import pdfplumber
except Exception:
    PLUMBER_OK = False

app = FastAPI(title="NovaAgent OCR Service", version="1.0.0")


# -----------------------------
# Models
# -----------------------------
class ExtractResponse(BaseModel):
    file_name: str
    mime_type: Optional[str] = None
    pages: int
    is_digital_pdf: Optional[bool] = None
    text: str
    blocks: List[Dict[str, Any]]
    tables: List[Dict[str, Any]]
    metadata: Dict[str, Any]


# -----------------------------
# Utilities
# -----------------------------
def _get_paddle() -> Optional["PaddleOCR"]:
    global _paddle_singleton
    if not PADDLE_OK:
        return None
    if _paddle_singleton is None:
        # English, angle cls on, det+rec
        _paddle_singleton = PaddleOCR(use_angle_cls=True, lang="en")
    return _paddle_singleton


def _page_text_ratio(doc: "fitz.Document") -> float:
    """Rough heuristic: how much selectable text exists vs pixels (0..1)."""
    try:
        chars = sum(len(page.get_text("text")) for page in doc)
        # Pages*some constant to avoid division by zero
        denom = max(1, doc.page_count) * 1000
        return min(1.0, chars / denom)
    except Exception:
        return 0.0


def _pixmap_to_pil(pix: "fitz.Pixmap") -> "Image.Image":
    # Convert PyMuPDF pixmap to PIL Image (RGB)
    data = pix.tobytes("png")
    return Image.open(io.BytesIO(data)).convert("RGB")


def _ocr_image_paddle(img: "Image.Image") -> List[Dict[str, Any]]:
    ocr = _get_paddle()
    if not ocr:
        return []
    # Paddle expects numpy array (BGR) under the hood; PIL is fine via np.asarray
    import numpy as np
    arr = np.array(img)
    result = ocr.ocr(arr, cls=True)
    blocks = []
    # result is list per image, each with lines
    for line in (result[0] or []):
        (x1, y1), (x2, y2), (x3, y3), (x4, y4) = line[0]
        txt, conf = line[1]
        blocks.append({
            "text": txt,
            "confidence": float(conf),
            "bbox": [x1, y1, x3, y3]
        })
    return blocks


def _ocr_image_tesseract(img: "Image.Image") -> List[Dict[str, Any]]:
    if not TESSERACT_OK:
        return []
    # Use tesseract TSV to get boxes + conf
    tsv = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    blocks = []
    for i in range(len(tsv["text"])):
        txt = tsv["text"][i]
        if not txt or txt.strip() == "":
            continue
        try:
            conf = float(tsv["conf"][i])
        except:
            conf = -1.0
        x, y, w, h = tsv["left"][i], tsv["top"][i], tsv["width"][i], tsv["height"][i]
        blocks.append({
            "text": txt,
            "confidence": conf / 100.0 if conf > 1 else 0.0,
            "bbox": [x, y, x + w, y + h]
        })
    return blocks


def _merge_blocks_to_text(blocks: List[Dict[str, Any]]) -> str:
    return " ".join(b["text"] for b in blocks if b.get("text"))


def _extract_tables_plumber(file_bytes: bytes) -> List[Dict[str, Any]]:
    if not PLUMBER_OK:
        return []
    tables_out = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for p_idx, page in enumerate(pdf.pages):
                try:
                    # Try multiple extraction strategies
                    table_sets = []
                    table_sets.extend(page.find_tables(table_settings={"vertical_strategy": "lines", "horizontal_strategy": "lines"}))
                    table_sets.extend(page.find_tables(table_settings={"vertical_strategy": "text", "horizontal_strategy": "text"}))
                    for t in table_sets:
                        if not t or not t.cells:
                            continue
                        # Convert to 2D text matrix
                        matrix = []
                        rows = t.extract()
                        if rows:
                            matrix = [[(cell or "").strip() for cell in row] for row in rows]
                        if matrix:
                            tables_out.append({
                                "page": p_idx + 1,
                                "rows": matrix,
                                "strategy": "pdfplumber"
                            })
                except:
                    continue
    except:
        pass
    return tables_out


def _extract_digital_pdf(doc: "fitz.Document") -> Dict[str, Any]:
    text_all = []
    blocks_all: List[Dict[str, Any]] = []
    meta_tables: List[Dict[str, Any]] = []

    for pno in range(doc.page_count):
        page = doc.load_page(pno)
        text = page.get_text("text")
        text_all.append(text)

        # Word-level geometry
        dict_content = page.get_text("dict")
        for block in dict_content.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    bbox = [span["bbox"][0], span["bbox"][1], span["bbox"][2], span["bbox"][3]]
                    blocks_all.append({
                        "text": span["text"],
                        "confidence": 1.0,  # digital text, assume perfect
                        "bbox": bbox,
                        "page": pno + 1
                    })

    return {
        "text": "\n".join(text_all),
        "blocks": blocks_all,
        "tables": meta_tables  # may be filled by pdfplumber separately
    }


def _extract_scanned_pdf(doc: "fitz.Document") -> Dict[str, Any]:
    blocks_all: List[Dict[str, Any]] = []
    texts: List[str] = []

    for pno in range(doc.page_count):
        page = doc.load_page(pno)
        # Render at 200-300 DPI for OCR (scale factor ~2 to 3)
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        if "Image" not in sys.modules:
            from PIL import Image  # lazy
        img = _pixmap_to_pil(pix)

        # Prefer PaddleOCR, fallback to Tesseract
        blocks = _ocr_image_paddle(img) if PADDLE_OK else []
        if not blocks and TESSERACT_OK:
            blocks = _ocr_image_tesseract(img)

        page_text = _merge_blocks_to_text(blocks)
        texts.append(page_text)
        for b in blocks:
            b["page"] = pno + 1
        blocks_all.extend(blocks)

    return {
        "text": "\n".join(texts),
        "blocks": blocks_all,
        "tables": []  # OCR-only: table detection could be added via PP-Structure if needed
    }


def _guess_mime(name: str) -> str:
    name = name.lower()
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith((".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp")):
        return "image"
    return "application/octet-stream"


# -----------------------------
# Routes
# -----------------------------
@app.get("/health")
def health():
    return {"ok": True, "paddle": PADDLE_OK, "tesseract": TESSERACT_OK, "pdfplumber": PLUMBER_OK}


@app.post("/extract", response_model=ExtractResponse)
async def extract(file: UploadFile = File(...), want_tables: Optional[bool] = Form(default=True)):
    file_bytes = await file.read()
    fname = file.filename or "uploaded"
    mime = _guess_mime(fname)

    text = ""
    blocks: List[Dict[str, Any]] = []
    tables: List[Dict[str, Any]] = []
    meta: Dict[str, Any] = {"engine": None}

    if mime == "application/pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        ratio = _page_text_ratio(doc)
        is_digital = ratio > 0.1  # heuristic threshold

        if is_digital:
            meta["engine"] = "pymupdf"
            parsed = _extract_digital_pdf(doc)
            text = parsed["text"]
            blocks = parsed["blocks"]
            if want_tables:
                tables = _extract_tables_plumber(file_bytes) if PLUMBER_OK else []
        else:
            meta["engine"] = "ocr"
            parsed = _extract_scanned_pdf(doc)
            text = parsed["text"]
            blocks = parsed["blocks"]
            # TODO: If you want OCR-based table detection, swap in PaddleOCR PP-Structure here.

        response = ExtractResponse(
            file_name=fname,
            mime_type=mime,
            pages=doc.page_count,
            is_digital_pdf=is_digital,
            text=text,
            blocks=blocks,
            tables=tables,
            metadata=meta
        )
        return JSONResponse(response.dict())

    elif mime == "image":
        # Direct image OCR
        if not (PADDLE_OK or TESSERACT_OK):
            return JSONResponse(status_code=500, content={"error": "No OCR engine available (install paddleocr or tesseract)."})
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        blk = _ocr_image_paddle(img) if PADDLE_OK else []
        if not blk and TESSERACT_OK:
            blk = _ocr_image_tesseract(img)
        text = _merge_blocks_to_text(blk)
        for b in blk:
            b["page"] = 1
        response = ExtractResponse(
            file_name=fname, mime_type=mime, pages=1, is_digital_pdf=None,
            text=text, blocks=blk, tables=[], metadata={"engine": "ocr"}
        )
        return JSONResponse(response.dict())

    else:
        return JSONResponse(status_code=400, content={"error": f"Unsupported file type for {fname}"})


if __name__ == "__main__":
    # Run: python3 server/ocr_service.py
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("OCR_PORT", "8001")))
