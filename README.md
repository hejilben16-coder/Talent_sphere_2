# Talent Sphere 2

## LLM API setup

Set one of the following providers before running the app:

- Gemini: set `GEMINI_API_KEY` and optionally `LLM_PROVIDER=gemini`
- Groq: set `GROQ_API_KEY` and optionally `LLM_PROVIDER=groq`

A template is available in [.env.example](.env.example).

Example:

```bash
cp .env.example .env
# edit .env and fill in your API key
npm run dev
```

## Streamlit UI (Python)

There is a lightweight Streamlit frontend that uses the Python RAG engine in `python_app`.

Run the Streamlit UI locally from the repository root:

```powershell
cd H:\Talent_sphere\Talent_sphere_2
python -m pip install -r python_app/requirements.txt
streamlit run python_app/streamlit_app.py
```

The Streamlit UI supports:
- Role selector (admin / student)
- Admin-only PDF upload and indexing
- Chat queries against uploaded PDFs
- Admin announcements (stored in `python_app/notifications.json`)

This UI is intended for quick local demos and does not replace the main Node/Express app. Use it when you want a simple Python-based interface to the RAG engine.
