import sqlite3
import json
import os
import uuid
from typing import List, Dict, Any, Optional
from src.config import DATABASE_PATH

def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    conn = get_connection()
    try:
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()

    migrate_from_data_json()

def migrate_from_data_json():
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database", "data.json")
    if not os.path.exists(json_path):
        return

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        if user_count > 0:
            return

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        plan_id = "plan_ml_101"
        cursor.execute("""
            INSERT OR IGNORE INTO study_plans (id, title, description, total_weeks, total_days)
            VALUES (?, ?, ?, ?, ?)
        """, (plan_id, "Machine Learning 101 Mastery", "Complete 7-day curriculum on ML fundamentals & applications", 1, 7))

        for day_num in range(1, 8):
            day_id = f"day_{plan_id}_{day_num}"
            cursor.execute("""
                INSERT OR IGNORE INTO study_plan_days (id, study_plan_id, week_number, day_number, title, learning_objective)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                day_id, plan_id, 1, day_num,
                f"Day {day_num}: ML Topic {day_num}",
                f"Master key concepts for Day {day_num} of Machine Learning"
            ))

        users = data.get("users", [])
        default_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"
        
        for u in users:
            role = "admin" if u.get("role") == "admin" or u.get("isAdmin") else "student"
            user_id = u.get("id") or f"usr_{uuid.uuid4().hex[:8]}"
            cursor.execute("""
                INSERT OR IGNORE INTO users (id, name, email, role, password_hash, status, course, assigned_study_plan_id, current_day)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                u.get("name", "User"),
                u.get("email", "user@example.com"),
                role,
                default_hash,
                "active",
                u.get("course", "Computer Science"),
                plan_id,
                u.get("current_day", 2 if role == "student" else 7)
            ))

            for d in range(1, 8):
                user_cur_day = u.get("current_day", 2 if role == "student" else 7)
                status = "completed" if d < user_cur_day else ("unlocked" if d == user_cur_day else "locked")
                cursor.execute("""
                    INSERT OR IGNORE INTO user_study_progress (id, user_id, study_plan_id, day_number, status)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"prog_{user_id}_{d}", user_id, plan_id, d, status))

        documents = data.get("documents", [])
        for doc in documents:
            doc_id = doc.get("id", f"doc_{uuid.uuid4().hex[:8]}")
            cursor.execute("""
                INSERT OR IGNORE INTO documents (id, name, size, page_count, chunk_count, uploaded_by, summary, status, study_plan_id, study_plan_day)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                doc.get("name", "Document.pdf"),
                doc.get("size", 1024),
                doc.get("pageCount", 1),
                doc.get("chunkCount", 1),
                doc.get("uploadedBy", "usr_admin_1"),
                doc.get("summary", "Document summary"),
                "ready",
                plan_id,
                1
            ))

        cursor.execute("""
            INSERT OR IGNORE INTO announcements (id, title, content, priority, target_group, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "ann_1",
            "Welcome to Talent Sphere AI Platform!",
            "Your AI-powered study dashboard and progressive learning plan are now active. Check today's unlocked materials.",
            "important",
            "all",
            "usr_admin_1"
        ))

        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error migrating seed data: {e}")
    finally:
        conn.close()

def query_db(query: str, args: tuple = (), one: bool = False) -> Any:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(query, args)
    rv = cursor.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv

def execute_db(query: str, args: tuple = ()) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(query, args)
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id
