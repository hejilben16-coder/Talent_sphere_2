-- Talent Sphere AI Relational Database Schema

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    course TEXT,
    assigned_study_plan_id TEXT,
    current_day INTEGER DEFAULT 1,
    reset_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    total_weeks INTEGER DEFAULT 1,
    total_days INTEGER DEFAULT 7,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_plan_days (
    id TEXT PRIMARY KEY,
    study_plan_id TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    learning_objective TEXT,
    FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    page_count INTEGER DEFAULT 1,
    chunk_count INTEGER DEFAULT 0,
    uploaded_by TEXT NOT NULL,
    summary TEXT,
    status TEXT DEFAULT 'ready',
    study_plan_id TEXT,
    study_plan_day INTEGER DEFAULT 1,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_study_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    study_plan_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('completed', 'unlocked', 'locked')),
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, study_plan_id, day_number)
);

CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    passing_score INTEGER DEFAULT 70,
    total_marks INTEGER DEFAULT 100,
    is_published INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('mcq', 'true_false', 'short_answer', 'fill_blank')),
    options_json TEXT, -- JSON array of options for MCQ
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium',
    source_doc_id TEXT,
    source_page INTEGER,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_assignments (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    user_id TEXT, -- NULL if assigned to group/all
    group_name TEXT,
    assigned_by TEXT NOT NULL,
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    max_attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_attempts (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    score INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 100,
    percentage REAL DEFAULT 0.0,
    time_taken_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_answers (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    student_answer TEXT,
    is_correct INTEGER DEFAULT 0,
    points_awarded INTEGER DEFAULT 0,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'important', 'high')),
    target_group TEXT DEFAULT 'all',
    created_by TEXT NOT NULL,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    study_plan_id TEXT NOT NULL,
    day_number INTEGER DEFAULT 7,
    overall_score INTEGER DEFAULT 0,
    tech_score INTEGER DEFAULT 0,
    clarity_score INTEGER DEFAULT 0,
    feedback_json TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
