import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from rag_engine import PyRAGEngine

app = FastAPI(title="Talent Sphere AI - Python Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = PyRAGEngine()

class ChatRequest(BaseModel):
    text: str
    userId: Optional[str] = "usr_admin"

@app.get("/api/health")
def health_check():
    return {"status": "ok", "engine": "Python FastAPI"}

@app.post("/api/chat/message")
def chat_message(req: ChatRequest):
    result = rag.answer_query(req.text)
    return {
        "message": {
            "id": "msg_python_1",
            "sender": "ai",
            "text": result["answer"],
            "sources": result["sources"]
        }
    }

@app.post("/api/pdfs/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    contents = await file.read()
    res = rag.process_pdf(contents, file.filename)
    return {"success": True, "document": res["doc"], "chunkCount": res["chunkCount"]}

@app.get("/api/pdfs")
def list_pdfs():
    return {"documents": rag.documents}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
