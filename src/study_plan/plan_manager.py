from typing import List, Dict, Any, Optional
from src.database.db import query_db, execute_db

def get_user_study_plan(user_id: str) -> Dict[str, Any]:
    user_row = query_db("SELECT * FROM users WHERE id = ?", (user_id,), one=True)
    if not user_row:
        return {}
    
    user = dict(user_row)
    plan_id = user.get("assigned_study_plan_id") or "plan_ml_101"
    plan_row = query_db("SELECT * FROM study_plans WHERE id = ?", (plan_id,), one=True)
    if not plan_row:
        return {}
    
    plan = dict(plan_row)
    days_rows = query_db("SELECT * FROM study_plan_days WHERE study_plan_id = ? ORDER BY day_number ASC", (plan_id,))
    days = [dict(d) for d in days_rows]

    # Retrieve progress
    prog_rows = query_db("SELECT * FROM user_study_progress WHERE user_id = ? AND study_plan_id = ?", (user_id, plan_id))
    prog_map = {p["day_number"]: p["status"] for p in prog_rows}

    user_current_day = user.get("current_day", 1)

    structured_days = []
    for d in days:
        day_num = d["day_number"]
        
        # Backend-enforced unlocking logic
        if day_num < user_current_day:
            status = "completed"
        elif day_num == user_current_day:
            status = "unlocked"
        else:
            status = "locked"

        # Check assigned documents
        docs = query_db("SELECT * FROM documents WHERE study_plan_id = ? AND study_plan_day = ?", (plan_id, day_num))
        doc_list = [dict(doc) for doc in docs]

        # Check assigned exams
        exams = query_db("""
            SELECT e.* FROM exams e
            JOIN exam_assignments ea ON e.id = ea.exam_id
            WHERE (ea.user_id = ? OR ea.user_id IS NULL)
        """, (user_id,))
        exam_list = [dict(ex) for ex in exams]

        structured_days.append({
            "day_number": day_num,
            "title": d["title"],
            "learning_objective": d["learning_objective"],
            "status": status,
            "documents": doc_list if status != "locked" else [], # Lock files on server side!
            "exams": exam_list if status != "locked" else []
        })

    return {
        "plan_id": plan_id,
        "title": plan["title"],
        "description": plan["description"],
        "current_day": user_current_day,
        "total_days": plan["total_days"],
        "days": structured_days
    }

def complete_day(user_id: str, day_number: int) -> bool:
    user = query_db("SELECT current_day FROM users WHERE id = ?", (user_id,), one=True)
    if not user:
        return False
    
    current_day = user["current_day"]
    if day_number == current_day:
        next_day = current_day + 1
        execute_db("UPDATE users SET current_day = ? WHERE id = ?", (next_day, user_id))
        
        # Update progress record
        execute_db("""
            INSERT OR REPLACE INTO user_study_progress (id, user_id, study_plan_id, day_number, status, completed_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (f"prog_{user_id}_{day_number}", user_id, "plan_ml_101", day_number, "completed"))
        
        execute_db("""
            INSERT OR REPLACE INTO user_study_progress (id, user_id, study_plan_id, day_number, status)
            VALUES (?, ?, ?, ?, ?)
        """, (f"prog_{user_id}_{next_day}", user_id, "plan_ml_101", next_day, "unlocked"))
        return True
    return False
