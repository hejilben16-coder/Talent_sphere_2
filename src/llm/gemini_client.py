import os
from typing import Optional, List
from google import genai
from src.config import GEMINI_API_KEY

FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro'
]

def generate_text(prompt: str, system_instruction: Optional[str] = None, api_key: Optional[str] = None) -> str:
    key = api_key or GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if not key:
        return "Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables."

    try:
        client = genai.Client(api_key=key)
        for model_name in FALLBACK_MODELS:
            try:
                config = {}
                if system_instruction:
                    config["system_instruction"] = system_instruction
                
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config if config else None
                )
                if response and response.text:
                    return response.text
            except Exception as err:
                print(f"[Gemini Fallback] Model {model_name} failed: {err}")
                continue
        return "Unable to generate response from Gemini AI models due to temporary rate limits or quota."
    except Exception as e:
        return f"Error connecting to Gemini API: {e}"
