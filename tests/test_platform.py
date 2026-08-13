import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.database.db import init_db, query_db, execute_db
from src.auth.security import hash_password, verify_password, authenticate_user
from src.study_plan.plan_manager import get_user_study_plan, complete_day
from src.exams.exam_engine import create_exam_manual, submit_exam_attempt

class TestTalentSphereAI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_database_initialization(self):
        users = query_db("SELECT * FROM users")
        self.assertGreater(len(users), 0)

    def test_password_hashing(self):
        raw_pass = "SecurePass123!"
        hashed = hash_password(raw_pass)
        self.assertTrue(verify_password(raw_pass, hashed))
        self.assertFalse(verify_password("WrongPass", hashed))

    def test_study_plan_day_unlocking(self):
        student = query_db("SELECT id, current_day FROM users WHERE role = 'student'", one=True)
        self.assertIsNotNone(student)
        
        plan = get_user_study_plan(student["id"])
        self.assertIn("days", plan)
        
        # Verify day unlocking progressive logic
        cur_day = student["current_day"]
        for d in plan["days"]:
            day_num = d["day_number"]
            if day_num < cur_day:
                self.assertEqual(d["status"], "completed")
            elif day_num == cur_day:
                self.assertEqual(d["status"], "unlocked")
            else:
                self.assertEqual(d["status"], "locked")

    def test_exam_creation_and_grading(self):
        admin = query_db("SELECT id FROM users WHERE role = 'admin'", one=True)
        student = query_db("SELECT id FROM users WHERE role = 'student'", one=True)
        
        questions = [
            {
                "question_text": "What is 2+2?",
                "question_type": "mcq",
                "options": ["3", "4", "5"],
                "correct_answer": "4"
            }
        ]
        exam_id = create_exam_manual("Math Basics", "Test exam", admin["id"], 10, 70, questions)
        q = query_db("SELECT id FROM exam_questions WHERE exam_id = ?", (exam_id,), one=True)
        
        # Submit attempt
        res = submit_exam_attempt("asgn_test", student["id"], exam_id, {q["id"]: "4"}, 120)
        self.assertEqual(res["score"], 10)
        self.assertEqual(res["percentage"], 100.0)

if __name__ == "__main__":
    unittest.main()
