import os
import tempfile
import json
import uuid
from typing import Dict, Any, Optional
from gtts import gTTS
from src.llm.gemini_client import generate_text
from src.rag.vector_store import vector_store
from src.database.db import execute_db

def text_to_speech_audio(text: str) -> Optional[str]:
    try:
        tts = gTTS(text=text, lang='en')
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        tts.save(temp_file.name)
        return temp_file.name
    except Exception as e:
        print(f"[VoiceEngine Error] gTTS audio generation failed: {e}")
        return None

def conduct_voice_interview_step(
    user_id: str,
    user_current_day: int,
    conversation_history: list,
    student_latest_answer: Optional[str] = None
) -> Dict[str, Any]:
    # Retrieve authorized chunks for interview context
    context_chunks = vector_store.retrieve_authorized_chunks(
        query="machine learning key concepts interview evaluation",
        user_current_day=user_current_day,
        top_k=4
    )
    context_str = "\n".join([c["content"] for c in context_chunks])

    history_str = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in conversation_history
    ])

    system_instruction = f"""You are the Talent Sphere AI Senior Technical AI Interviewer.
Your goal is to conduct a professional 4-question technical voice interview based ONLY on the student's authorized study materials.

AUTHORIZED MATERIAL CONTEXT:
{context_str}

RULES:
1. Ask one focused technical question at a time.
2. Evaluate the student's answer gently for conceptual clarity and accuracy.
3. If this is question 4 or the interview is concluding, set "is_complete": true and produce a final evaluation report.

RETURN ONLY VALID JSON:
{{
  "ai_response_text": "Good explanation! Now for question 2: ...",
  "is_complete": false,
  "evaluation": null
}}

When "is_complete" is true, include "evaluation":
{{
  "overall_score": 88,
  "tech_score": 85,
  "clarity_score": 90,
  "feedback": "Strong grasp of supervised learning and model evaluation..."
}}
"""

    prompt = f"INTERVIEW HISTORY:\n{history_str}\n\nSTUDENT LATEST ANSWER:\n{student_latest_answer or 'None (Start Interview)'}"

    raw_res = generate_text(prompt, system_instruction=system_instruction)
    cleaned = raw_res.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(cleaned)
        ai_text = data.get("ai_response_text", "Let's begin the technical voice interview. Can you explain key concepts from your study materials?")
        audio_file = text_to_speech_audio(ai_text)
        
        if data.get("is_complete") and data.get("evaluation"):
            eval_data = data["evaluation"]
            execute_db("""
                INSERT INTO interview_sessions (id, user_id, study_plan_id, day_number, overall_score, tech_score, clarity_score, feedback_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"int_{uuid.uuid4().hex[:8]}",
                user_id,
                "plan_ml_101",
                user_current_day,
                eval_data.get("overall_score", 80),
                eval_data.get("tech_score", 80),
                eval_data.get("clarity_score", 80),
                json.dumps(eval_data.get("feedback", ""))
            ))

        return {
            "ai_response_text": ai_text,
            "audio_file": audio_file,
            "is_complete": data.get("is_complete", False),
            "evaluation": data.get("evaluation")
        }
    except Exception as e:
        ai_fallback = "Let's discuss Machine Learning fundamentals. How would you explain supervised learning versus unsupervised learning?"
        return {
            "ai_response_text": ai_fallback,
            "audio_file": text_to_speech_audio(ai_fallback),
            "is_complete": False,
            "evaluation": None
        }
