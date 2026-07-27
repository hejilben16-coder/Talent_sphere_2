# Talent Sphere AI - Pure Python Backend Implementation

This directory contains a standalone, pure Python implementation of the **Talent Sphere AI** RAG knowledge base engine and REST API.

## Features Included
- **PyPDF Document Ingestion**: Fast, local PDF parsing without memory leaks or raw syntax noise.
- **RAG Vector Search & Chunking**: Automatic page-aware chunking and keyword relevance scoring.
- **Google GenAI Integration**: Uses the official `google-genai` Python SDK with intelligent model fallback (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).
- **FastAPI Web Service**: High-performance REST endpoints compatible with standard frontends.

## Quick Start

### 1. Install Dependencies
```bash
cd python_app
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Run the Python Server
```bash
python main.py
# or using uvicorn directly:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints
- `GET /api/health` - Check backend status
- `POST /api/chat/message` - Query RAG knowledge base
- `POST /api/pdfs/upload` - Upload PDF documents
- `GET /api/pdfs` - List uploaded documents
