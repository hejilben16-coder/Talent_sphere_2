import os
import re
import json
from typing import List, Dict, Any, Optional
from src.config import CHROMA_DB_PATH
from src.database.db import query_db, execute_db

class VectorStoreManager:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            self.chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
            self.collection = self.chroma_client.get_or_create_collection(name="talentsphere_chunks")
        except Exception as e:
            print(f"[VectorStore] ChromaDB persistent client initialization note: {e}")

    def add_chunks(self, doc_id: str, doc_name: str, study_plan_id: str, study_plan_day: int, chunks: List[Dict[str, Any]]):
        if not chunks:
            return

        if self.collection:
            ids = [c["id"] for c in chunks]
            documents = [c["content"] for c in chunks]
            metadatas = [
                {
                    "doc_id": doc_id,
                    "doc_name": doc_name,
                    "page_number": c.get("pageNumber", 1),
                    "study_plan_id": study_plan_id or "plan_ml_101",
                    "study_plan_day": int(study_plan_day or 1)
                }
                for c in chunks
            ]
            try:
                self.collection.add(ids=ids, documents=documents, metadatas=metadatas)
            except Exception as e:
                print(f"[VectorStore] Error adding to ChromaDB: {e}")

    def retrieve_authorized_chunks(
        self,
        query: str,
        user_current_day: int,
        study_plan_id: Optional[str] = "plan_ml_101",
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        results = []

        # 1. Try ChromaDB retrieval if available
        if self.collection:
            try:
                chroma_res = self.collection.query(
                    query_texts=[query],
                    n_results=top_k * 2,
                    where={"study_plan_day": {"$lte": int(user_current_day)}}
                )
                if chroma_res and chroma_res.get("documents") and chroma_res["documents"][0]:
                    docs = chroma_res["documents"][0]
                    metas = chroma_res["metadatas"][0]
                    for idx, doc in enumerate(docs):
                        meta = metas[idx]
                        results.append({
                            "content": doc,
                            "doc_name": meta.get("doc_name", "Document"),
                            "page_number": meta.get("page_number", 1),
                            "study_plan_day": meta.get("study_plan_day", 1),
                            "score": 1.0
                        })
                    return results[:top_k]
            except Exception as e:
                print(f"[VectorStore] ChromaDB query error, fallback to SQLite chunks: {e}")

        # 2. Fallback SQLite Keyword search for unlocked days
        query_words = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
        sql = """
            SELECT d.name as doc_name, d.study_plan_day, d.summary, d.id as doc_id
            FROM documents d
            WHERE d.study_plan_day <= ?
        """
        doc_rows = query_db(sql, (int(user_current_day),))
        
        for doc in doc_rows:
            doc_dict = dict(doc)
            content = doc_dict.get("summary") or f"Document {doc_dict['doc_name']} for Day {doc_dict['study_plan_day']}"
            score = sum(1.0 for w in query_words if w in content.lower())
            results.append({
                "content": content,
                "doc_name": doc_dict["doc_name"],
                "page_number": 1,
                "study_plan_day": doc_dict["study_plan_day"],
                "score": score + 0.5
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

vector_store = VectorStoreManager()
