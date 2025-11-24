# Ollama OCR Setup Guide

## Overview

Your NovaAgent app now uses **Ollama** for FREE local OCR processing! No more API costs for bill extraction.

### OCR Priority Stack
1. **🏠 Ollama** (local, free, fast) ← **YOU ARE HERE**
2. **📄 pdf-parse** (fallback, free, basic)
3. **☁️ Claude AI** (cloud, paid, most accurate) ← Disabled to avoid charges

## Prerequisites

### 1. Install Ollama

If you haven't already:

**Windows:**
```bash
# Download from: https://ollama.com/download/windows
# Or use winget:
winget install Ollama.Ollama
```

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull a Vision Model

Ollama needs a **vision model** to read PDFs. Recommended options:

#### Option 1: LLaVA (Recommended - Fast & Accurate)
```bash
ollama pull llava:latest
```
- **Size**: ~4.7GB
- **Speed**: Very fast (5-10 seconds per bill)
- **Accuracy**: Good for utility bills

#### Option 2: Llama 3.2 Vision (Higher Accuracy)
```bash
ollama pull llama3.2-vision:latest
```
- **Size**: ~7.9GB
- **Speed**: Moderate (10-20 seconds per bill)
- **Accuracy**: Better for complex layouts

#### Option 3: LLaVA 13B (Best Accuracy)
```bash
ollama pull llava:13b
```
- **Size**: ~8GB
- **Speed**: Slower (15-30 seconds per bill)
- **Accuracy**: Excellent for all document types

### 3. Start Ollama Server

Ollama runs as a background service:

**Windows/macOS:**
```bash
# Ollama starts automatically after installation
# Or manually start:
ollama serve
```

**Linux:**
```bash
sudo systemctl start ollama
# Or run in terminal:
ollama serve
```

**Verify it's running:**
```bash
# Should return: "Ollama is running"
curl http://localhost:11434
```

## Configuration

### Local Development (.env.local)

Add these to your `nova-agent-main/.env.local` file:

```bash
# Ollama OCR Configuration
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_VISION_MODEL=llava:latest

# Optional: Force local OCR (skip Claude even if API key exists)
OCR_PREFER_LOCAL=true
```

### Production (Vercel)

For production, you need to host Ollama on a server:

**Option 1: Railway/Render (Recommended)**
1. Deploy Ollama container
2. Get public URL (e.g., `https://ollama-xyz.railway.app`)
3. Add to Vercel env vars:
   ```bash
   vercel env add OLLAMA_ENDPOINT production
   # Enter: https://your-ollama-server.com
   
   vercel env add OLLAMA_VISION_MODEL production
   # Enter: llava:latest
   ```

**Option 2: VPS (DigitalOcean, Linode, etc.)**
1. Install Ollama on VPS
2. Expose port 11434 with HTTPS (use nginx + Let's Encrypt)
3. Add secure URL to Vercel

**Option 3: Local Tunnel (Development Only)**
```bash
# Expose local Ollama to internet
ngrok http 11434
# Add ngrok URL to Vercel env vars
```

## Testing

### 1. Test Ollama Locally

```bash
# Test vision model is working
ollama run llava:latest "What's in this image?" < test-bill.pdf
```

### 2. Test in App

1. **Start dev server:**
   ```bash
   cd nova-agent-main
   npm run dev
   ```

2. **Upload a bill** through the app

3. **Check logs** for confirmation:
   ```
   ✅ "Attempting Ollama PDF extraction (local)..."
   ✅ "Ollama extraction complete: 2453 characters"
   ✅ "Bill data parsed successfully"
   ```

4. **Verify data extraction:**
   - Navigate to uploaded bill
   - Check "Usage Analysis Summary"
   - Should show kWh, costs, billing period

### 3. Troubleshooting

**Problem: "OLLAMA_ENDPOINT not configured"**
```bash
# Check .env.local exists and has:
OLLAMA_ENDPOINT=http://localhost:11434
```

**Problem: "Ollama extraction failed: connect ECONNREFUSED"**
```bash
# Ollama isn't running. Start it:
ollama serve

# Or check if it's running:
curl http://localhost:11434
```

**Problem: "model 'llava:latest' not found"**
```bash
# Pull the vision model:
ollama pull llava:latest

# Verify it's installed:
ollama list
```

**Problem: "Ollama extraction failed, trying fallback"**
- Vision model might not support PDF format
- Check Ollama logs: `ollama logs`
- Try different model: `OLLAMA_VISION_MODEL=llama3.2-vision:latest`

## Performance Comparison

| Method | Speed | Cost | Accuracy | Best For |
|--------|-------|------|----------|----------|
| **Ollama (llava)** | ⚡ 5-10s | 💰 FREE | ⭐⭐⭐⭐ | Most bills |
| **Ollama (llama3.2-vision)** | ⚡ 10-20s | 💰 FREE | ⭐⭐⭐⭐⭐ | Complex bills |
| **pdf-parse** | ⚡ 1-2s | 💰 FREE | ⭐⭐⭐ | Text-based PDFs |
| **Claude AI** | ⚡ 3-8s | 💵 $0.01/bill | ⭐⭐⭐⭐⭐ | All formats |

## System Architecture

```
Bill Upload
    ↓
Check OLLAMA_ENDPOINT?
    ↓
  YES → Try Ollama Vision
    ↓         ↓
  Success   Failed
    ↓         ↓
  DONE   Try pdf-parse
           ↓         ↓
         Success   Failed
           ↓         ↓
         DONE   Try Claude (if API key)
                  ↓
                DONE or ERROR
```

## Cost Savings

**Before (Claude AI):**
- 100 bills/month = $1.00
- 1,000 bills/month = $10.00
- 10,000 bills/month = $100.00

**After (Ollama):**
- ∞ bills/month = **$0.00** 🎉

**One-time cost:**
- None! Ollama is completely free

## Advanced Configuration

### Custom Vision Model

Want to use a different model?

```bash
# Install custom model
ollama pull bakllava:latest

# Update .env.local
OLLAMA_VISION_MODEL=bakllava:latest
```

### Multiple Models for Fallback

You can configure multiple models in `src/lib/config.ts`:

```typescript
export const OCR_CONFIG = {
  OLLAMA_VISION_MODEL: process.env.OLLAMA_VISION_MODEL || "llava:latest",
  OLLAMA_FALLBACK_MODEL: process.env.OLLAMA_FALLBACK_MODEL || "llama3.2-vision:latest",
  // ... rest of config
};
```

### Performance Tuning

Edit `src/lib/ocr.ts` → `extractTextWithOllama()`:

```typescript
// Faster but less accurate
temperature: 0.0,
max_tokens: 2048,

// Slower but more accurate
temperature: 0.1,
max_tokens: 4096,
```

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull vision model (`ollama pull llava:latest`)
3. ✅ Start Ollama server (`ollama serve`)
4. ✅ Add env vars to `.env.local`
5. ✅ Test with a bill upload
6. ✅ Deploy changes to production (optional)

## Support

- **Ollama Docs**: https://ollama.com/docs
- **Vision Models**: https://ollama.com/library?q=vision
- **NovaAgent Issues**: Check `BILL_OCR_FIX.md` for troubleshooting

---

**Status**: ✅ Ollama OCR configured  
**Date**: November 24, 2025  
**Cost**: $0.00 (FREE) 🎉

