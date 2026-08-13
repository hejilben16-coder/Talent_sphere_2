import json
import uuid
from typing import List, Dict, Any, Optional
from src.database.db import query_db, execute_db
from src.llm.gemini_client import generate_text

def create_exam_manual(
    title: str,
    description: str,
    created_by: str,
    duration_minutes: int,
    passing_score: int,
    questions: List[Dict[str, Any]]
) -> str:
    exam_id = f"exam_{uuid.uuid4().hex[:8]}"
    execute_db("""
        INSERT INTO exams (id, title, description, created_by, duration_minutes, passing_score, total_marks, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    """, (exam_id, title, description, created_by, duration_minutes, passing_score, len(questions) * 10))

    for q in questions:
        q_id = f"q_{uuid.uuid4().hex[:8]}"
        execute_db("""
            INSERT INTO exam_questions (id, exam_id, question_text, question_type, options_json, correct_answer, explanation, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q_id,
            exam_id,
            q.get("question_text"),
            q.get("question_type", "mcq"),
            json.dumps(q.get("options", [])),
            q.get("correct_answer"),
            q.get("explanation", ""),
            q.get("difficulty", "medium")
        ))
    return exam_id

def generate_exam_with_ai(topic: str, question_count: int, difficulty: str, created_by: str) -> Optional[Dict[str, Any]]:
    prompt = f"""You are an expert exam creator for Talent Sphere AI.
Generate a structured exam on the topic: "{topic}".
Difficulty: {difficulty}
Number of Questions: {question_count}

Return ONLY valid JSON array with objects in this format:
[
  {{
    "question_text": "What is ...?",
    "question_type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Option A is correct because...",
    "difficulty": "{difficulty}"
  }}
]
Do not include markdown code block formatting or outside text.
"""
    raw_res = generate_text(prompt)
    cleaned = raw_res.replace("```json", "").replace("```", "").strip()
    
    try:
        questions = json.loads(cleaned)
        if isinstance(questions, list) and len(questions) > 0:
            exam_title = f"{topic} ({difficulty.capitalize()} Assessment)"
            exam_id = create_exam_manual(
                title=exam_title,
                description=f"AI-generated assessment on {topic}",
                created_by=created_by,
                duration_minutes=15 + (question_count * 2),
                passing_score=70,
                questions=questions
            )
            return {"exam_id": exam_id, "title": exam_title, "questions": questions}
    except Exception as e:
        print(f"[ExamEngine Error] AI Exam JSON parse error: {e}")
    return None

def assign_exam(exam_id: str, assigned_by: str, user_id: Optional[str] = None, group_name: Optional[str] = "all") -> str:
    assign_id = f"asgn_{uuid.uuid4().hex[:8]}"
    execute_db("""
        INSERT INTO exam_assignments (id, exam_id, user_id, group_name, assigned_by)
        VALUES (?, ?, ?, ?, ?)
    """, (assign_id, exam_id, user_id, group_name, assigned_by))
    return assign_id

def submit_exam_attempt(assignment_id: str, user_id: str, exam_id: str, answers: Dict[str, str], time_taken_sec: int) -> Dict[str, Any]:
    questions = query_db("SELECT * FROM exam_questions WHERE exam_id = ?", (exam_id,))
    total_q = len(questions)
    if total_q == 0:
        return {"score": 0, "percentage": 0}

    correct_count = 0
    attempt_id = f"att_{uuid.uuid4().hex[:8]}"

    for q in questions:
        q_dict = dict(q)
        q_id = q_dict["id"]
        correct_ans = q_dict["correct_answer"].strip().lower()
        student_ans = (answers.get(q_id) or "").strip().lower()
        
        is_corr = 1 if student_ans == correct_ans else 0
        if is_corr:
            correct_count += 1
        
        execute_db("""
            INSERT INTO exam_answers (id, attempt_id, question_id, student_answer, is_correct, points_awarded)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (f"ans_{uuid.uuid4().hex[:8]}", attempt_id, q_id, answers.get(q_id, ""), is_corr, 10 if is_corr else 0))

    score = correct_count * 10
    total_marks = total_q * 10
    percentage = round((score / total_marks) * 100, 1)

    execute_db("""
        INSERT INTO exam_attempts (id, assignment_id, user_id, exam_id, score, total_marks, percentage, time_taken_seconds, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    """, (attempt_id, assignment_id, user_id, exam_id, score, total_marks, percentage, time_taken_sec))

    return {
        "attempt_id": attempt_id,
        "score": score,
        "total_marks": total_marks,
        "percentage": percentage,
        "correct_count": correct_count,
        "total_questions": total_q
    }
