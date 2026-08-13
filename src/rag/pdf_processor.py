import os
import re
import uuid
import math
from typing import Dict, Any, List, Tuple
from pypdf import PdfReader
from src.config import UPLOAD_DIR
from src.database.db import execute_db, query_db
from src.rag.vector_store import vector_store

def clean_pdf_text(raw_text: str) -> str:
    if not raw_text:
        return ""
    lines = raw_text.splitlines()
    filtered = []
    syntax_noise = [
        '/Type', '/Catalog', '/Pages', '/MediaBox', '/Font', '/Contents',
        '/Parent', '/Resources', '/DeviceRGB', 'endobj', 'startxref', 'xref',
        'trailer', '/FlateDecode', '/PageLabels'
    ]
    for line in lines:
        if any(noise in line for noise in syntax_noise) or line.strip().startswith('%PDF-'):
            continue
        filtered.append(line)
    return re.sub(r'\s+', ' ', '\n'.join(filtered)).strip()

def process_and_store_pdf(
    file_bytes: bytes,
    file_name: str,
    uploaded_by: str,
    study_plan_id: str = "plan_ml_101",
    study_plan_day: int = 1
) -> Dict[str, Any]:
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file_name}")

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    page_count = 1
    extracted_pages = []

    try:
        reader = PdfReader(file_path)
        page_count = len(reader.pages)
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            cleaned = clean_pdf_text(text)
            if cleaned:
                extracted_pages.append((idx + 1, cleaned))
    except Exception as e:
        print(f"[PDFProcessor] PyPDF extraction error: {e}")

    chunks = []
    if extracted_pages:
        for page_num, content in extracted_pages:
            chunks.append({
                "id": f"chk_{doc_id}_p{page_num}",
                "docId": doc_id,
                "docName": file_name,
                "pageNumber": page_num,
                "content": content[:1500]
            })
    else:
        # Fallback chunking
        chunks.append({
            "id": f"chk_{doc_id}_1",
            "docId": doc_id,
            "docName": file_name,
            "pageNumber": 1,
            "content": f"Document {file_name} for Study Day {study_plan_day}"
        })

    summary = f"PDF Document '{file_name}' ({page_count} pages) assigned to Study Plan Day {study_plan_day}."
    if chunks and len(chunks[0]["content"]) > 50:
        summary = chunks[0]["content"][:250] + "..."

    execute_db("""
        INSERT INTO documents (id, name, size, page_count, chunk_count, uploaded_by, summary, status, study_plan_id, study_plan_day)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        doc_id,
        file_name,
        len(file_bytes),
        page_count,
        len(chunks),
        uploaded_by,
        summary,
        "ready",
        study_plan_id,
        study_plan_day
    ))

    # Add to ChromaDB vector store
    vector_store.add_chunks(doc_id, file_name, study_plan_id, study_plan_day, chunks)

    return {
        "id": doc_id,
        "name": file_name,
        "size": len(file_bytes),
        "page_count": page_count,
        "chunk_count": len(chunks),
        "study_plan_day": study_plan_day
    }
