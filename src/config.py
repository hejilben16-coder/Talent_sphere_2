import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "no-reply@talentsphere.ai")

DATABASE_PATH = os.path.join(BASE_DIR, os.getenv("DATABASE_PATH", "database/app.db"))
CHROMA_DB_PATH = os.path.join(BASE_DIR, os.getenv("CHROMA_DB_PATH", "vector_store/chroma"))
UPLOAD_DIR = os.path.join(BASE_DIR, os.getenv("UPLOAD_DIR", "uploaded_pdfs"))

os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
os.makedirs(CHROMA_DB_PATH, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
