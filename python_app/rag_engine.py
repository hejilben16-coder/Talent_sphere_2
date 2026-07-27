import os
import re
import math
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
from google import genai

# Models to attempt in fallback order
FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro'
]

def clean_pdf_text(raw_text: str) -> str:
    """Removes raw PDF binary tokens and standardizes whitespace."""
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

class PyRAGEngine:
    def __init__(self, upload_dir: str = "./uploaded_pdfs"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)
        self.documents: List[Dict[str, Any]] = []
        self.chunks: List[Dict[str, Any]] = []

    def process_pdf(self, file_bytes: bytes, file_name: str, user_id: str = "usr_admin") -> Dict[str, Any]:
        doc_id = f"doc_{int(math.floor(os.times().elapsed * 1000))}"
        file_path = os.path.join(self.upload_dir, f"{doc_id}.pdf")
        
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # 1. Parse text using pypdf
        text = ""
        page_count = 1
        try:
            reader = PdfReader(file_path)
            page_count = len(reader.pages)
            pages_text = []
            for idx, page in enumerate(reader.pages):
                extracted = page.extract_text() or ""
                pages_text.append(f"=== Page {idx + 1} ===\n{extracted}")
            text = clean_pdf_text("\n".join(pages_text))
        except Exception as e:
            print(f"Error parsing PDF with PyPDF: {e}")

        # 2. Chunking logic
        chunks = []
        page_sections = re.split(r'===\s*Page\s*(\d+)\s*===', text, flags=re.IGNORECASE)
        
        if len(page_sections) >= 3:
            for i in range(1, len(page_sections), 2):
                pg_num = int(page_sections[i])
                pg_content = page_sections[i+1].strip() if i+1 < len(page_sections) else ""
                if pg_content:
                    chunks.append({
                        "id": f"chk_{doc_id}_p{pg_num}",
                        "docId": doc_id,
                        "docName": file_name,
                        "pageNumber": pg_num,
                        "content": pg_content[:1500]
                    })
        else:
            clean_text = re.sub(r'\s+', ' ', text).strip()
            chunk_size = 800
            overlap = 150
            start = 0
            chunk_idx = 1
            while start < len(clean_text):
                sub = clean_text[start:start + chunk_size]
                if sub.strip():
                    chunks.append({
                        "id": f"chk_{doc_id}_{chunk_idx}",
                        "docId": doc_id,
                        "docName": file_name,
                        "pageNumber": 1,
                        "content": sub
                    })
                    chunk_idx += 1
                start += (chunk_size - overlap)

        doc_info = {
            "id": doc_id,
            "name": file_name,
            "size": len(file_bytes),
            "pageCount": page_count,
            "chunkCount": len(chunks),
            "uploadedBy": user_id,
            "status": "ready"
        }

        self.documents.append(doc_info)
        self.chunks.extend(chunks)

        return {"doc": doc_info, "chunkCount": len(chunks)}

    def retrieve_chunks(self, query: str, top_k: int = 6) -> List[Dict[str, Any]]:
        query_words = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
        scored = []
        for chunk in self.chunks:
            text_lower = chunk["content"].lower()
            score = sum(1.5 for w in query_words if w in text_lower)
            if score > 0:
                scored.append({"chunk": chunk, "score": score})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def answer_query(self, query: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        retrieved = self.retrieve_chunks(query)
        if not retrieved:
            return {
                "answer": "No relevant information found in the uploaded PDF documents.",
                "sources": []
            }

        context = "\n\n".join([
            f"[Source: {item['chunk']['docName']}, Page {item['chunk']['pageNumber']}]\n{item['chunk']['content']}"
            for item in retrieved
        ])

        sources = [
            {
                "docName": item["chunk"]["docName"],
                "pageNumber": item["chunk"]["pageNumber"],
                "snippet": item["chunk"]["content"][:200],
                "score": item["score"]
            }
            for item in retrieved
        ]

        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")

        if not api_key:
            top_item = retrieved[0]["chunk"]
            return {
                "answer": f"### Document Content Excerpt\n\n{top_item['content']}\n\n*[Citation: {top_item['docName']}, Page {top_item['pageNumber']}]*",
                "sources": sources
            }

        prompt = f"""You are Talent Sphere AI, an expert educational document assistant.
Answer the user's query directly and thoroughly using the provided document context.

DOCUMENT CONTEXT:
{context}

USER QUERY:
{query}
"""

        try:
            client = genai.Client(api_key=api_key)
            answer_text = None

            for model_name in FALLBACK_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    if response and response.text:
                        answer_text = response.text
                        break
                except Exception as model_err:
                    print(f"Model {model_name} error: {model_err}")
                    continue

            if not answer_text:
                top_item = retrieved[0]["chunk"]
                answer_text = f"### Document Content Excerpt\n\n{top_item['content']}\n\n*[Citation: {top_item['docName']}, Page {top_item['pageNumber']}]*"

            return {"answer": answer_text, "sources": sources}

        except Exception as e:
            top_item = retrieved[0]["chunk"]
            return {
                "answer": f"### Document Content Excerpt\n\n{top_item['content']}\n\n*[Citation: {top_item['docName']}, Page {top_item['pageNumber']}]*",
                "sources": sources
            }
