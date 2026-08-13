import streamlit as st
import os
import json
import base64
from pathlib import Path

# Page config
st.set_page_config(
    page_title="Talent Sphere AI — Learning Management Platform",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom SaaS CSS Styling
st.markdown("""
<style>
    /* Clean Modern SaaS Aesthetic */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .stApp {
        background-color: #f8fafc;
    }
    
    /* Header Bar */
    .brand-header {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        padding: 24px;
        border-radius: 12px;
        color: #ffffff;
        margin-bottom: 24px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .brand-title {
        font-size: 26px;
        font-weight: 700;
        margin: 0;
        color: #38bdf8;
    }
    
    .brand-subtitle {
        font-size: 14px;
        color: #94a3b8;
        margin-top: 4px;
    }
    
    /* Custom Cards */
    .metric-card {
        background: #ffffff;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        margin-bottom: 16px;
    }
    
    .metric-value {
        font-size: 28px;
        font-weight: 700;
        color: #0f172a;
    }
    
    .metric-label {
        font-size: 13px;
        font-weight: 500;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Day-locking timeline badge */
    .day-badge-completed {
        background-color: #d1fae5;
        color: #065f46;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
    }
    
    .day-badge-unlocked {
        background-color: #dbeafe;
        color: #1e40af;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
    }
    
    .day-badge-locked {
        background-color: #f3f4f6;
        color: #9ca3af;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
    }

    /* Buttons */
    .stButton>button {
        border-radius: 8px;
        font-weight: 500;
    }
</style>
""", unsafe_allow_html=True)

# Initialize database
from src.database.db import init_db, query_db, execute_db
init_db()

from src.auth.security import authenticate_user, is_admin, is_student, hash_password, generate_token, get_user_by_email
from src.study_plan.plan_manager import get_user_study_plan, complete_day
from src.rag.vector_store import vector_store
from src.rag.pdf_processor import process_and_store_pdf
from src.llm.gemini_client import generate_text
from src.email.mail_service import send_student_welcome_email, send_exam_notification_email
from src.exams.exam_engine import create_exam_manual, generate_exam_with_ai, assign_exam, submit_exam_attempt
from src.voice.voice_engine import conduct_voice_interview_step
from src.analytics.reporter import create_student_progress_chart, create_admin_performance_chart

# Session State Initialization
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "user" not in st.session_state:
    st.session_state.user = None
if "active_nav" not in st.session_state:
    st.session_state.active_nav = "dashboard"

# Header Render
st.markdown("""
<div class="brand-header">
    <div class="brand-title">🎓 TALENT SPHERE AI</div>
    <div class="brand-subtitle">AI-Powered SaaS Learning Platform & Day-Progressive Mastery Engine</div>
</div>
""", unsafe_allow_html=True)

# ---------------------------------------------------------
# AUTHENTICATION SCREEN
# ---------------------------------------------------------
if not st.session_state.authenticated:
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.subheader("🔑 Sign In to Your Learning Portal")
        
        tab_login, tab_reset = st.tabs(["Login", "Forgot Password"])
        
        with tab_login:
            email_input = st.text_input("Email Address", value="student@example.com")
            password_input = st.text_input("Password", type="password", value="password123")
            
            if st.button("Log In", use_container_width=True, type="primary"):
                user = authenticate_user(email_input, password_input)
                if user:
                    st.session_state.authenticated = True
                    st.session_state.user = user
                    st.session_state.active_nav = "dashboard"
                    st.success(f"Welcome back, {user['name']}!")
                    st.rerun()
                else:
                    st.error("Invalid credentials or account inactive. Default test accounts: admin@example.com or student@example.com (Password: password123)")
        
        with tab_reset:
            reset_email = st.text_input("Enter your account email")
            if st.button("Send Reset Link"):
                u = get_user_by_email(reset_email)
                if u:
                    token = generate_token()
                    execute_db("UPDATE users SET reset_token = ? WHERE id = ?", (token, u["id"]))
                    st.success("Password reset instructions have been dispatched to your email address.")
                else:
                    st.error("No account found with that email address.")
    st.stop()

# Logout Handler in Sidebar
user = st.session_state.user
user_role = user.get("role", "student")

st.sidebar.markdown(f"### 👤 {user['name']}")
st.sidebar.caption(f"Role: **{user_role.upper()}** | {user['email']}")

if st.sidebar.button("🚪 Log Out", use_container_width=True):
    st.session_state.authenticated = False
    st.session_state.user = None
    st.rerun()

st.sidebar.divider()

# ---------------------------------------------------------
# NAVIGATION ROUTING
# ---------------------------------------------------------
if is_admin(user):
    nav_options = [
        "📊 Admin Dashboard",
        "👥 Student User Management",
        "📚 PDF Document Management",
        "📝 Exam Creator & Assignments",
        "🤖 Admin AI Assistant",
        "📢 Announcements & Alerts",
        "📈 Platform Analytics"
    ]
else:
    nav_options = [
        "🚀 Student Dashboard",
        "📖 Today's Learning Materials",
        "🤖 Student AI Tutor",
        "🎙️ AI Voice Interviewer",
        "✍️ My Exams & Assessments",
        "📢 Announcements",
        "📊 My Study Progress"
    ]

selected_page = st.sidebar.radio("Navigation", nav_options)

# =========================================================
# ADMIN ROLE PORTAL
# =========================================================
if is_admin(user):
    if "Admin Dashboard" in selected_page:
        st.title("📊 Admin Overview & System Metrics")
        
        c1, c2, c3, c4 = st.columns(4)
        student_count = query_db("SELECT COUNT(*) FROM users WHERE role = 'student'", one=True)[0]
        doc_count = query_db("SELECT COUNT(*) FROM documents", one=True)[0]
        exam_count = query_db("SELECT COUNT(*) FROM exams", one=True)[0]
        attempt_count = query_db("SELECT COUNT(*) FROM exam_attempts", one=True)[0]

        with c1:
            st.markdown(f"<div class='metric-card'><div class='metric-label'>Total Students</div><div class='metric-value'>{student_count}</div></div>", unsafe_allow_html=True)
        with c2:
            st.markdown(f"<div class='metric-card'><div class='metric-label'>Learning PDFs</div><div class='metric-value'>{doc_count}</div></div>", unsafe_allow_html=True)
        with c3:
            st.markdown(f"<div class='metric-card'><div class='metric-label'>Published Exams</div><div class='metric-value'>{exam_count}</div></div>", unsafe_allow_html=True)
        with c4:
            st.markdown(f"<div class='metric-card'><div class='metric-label'>Completed Exams</div><div class='metric-value'>{attempt_count}</div></div>", unsafe_allow_html=True)

        st.subheader("Platform Performance Overview")
        fig = create_admin_performance_chart()
        st.plotly_chart(fig, use_container_width=True)

    elif "Student User Management" in selected_page:
        st.title("👥 Student User Management & Onboarding")
        
        tab_list, tab_create = st.tabs(["Student Directory", "➕ Create New Student"])
        
        with tab_list:
            students = query_db("SELECT id, name, email, phone, course, current_day, status, created_at FROM users WHERE role = 'student'")
            st.dataframe([dict(s) for s in students], use_container_width=True)

        with tab_create:
            st.subheader("Create & Invite Student Account")
            with st.form("new_student_form"):
                new_name = st.text_input("Full Name")
                new_email = st.text_input("Email Address")
                new_phone = st.text_input("Phone Number (Optional)")
                new_course = st.selectbox("Assigned Course", ["Machine Learning 101", "Data Science Core", "AI Software Engineering"])
                submit_student = st.form_submit_button("Create Account & Send Email")

                if submit_student:
                    if new_name and new_email:
                        temp_pass = generate_token()[:10]
                        pass_hash = hash_password(temp_pass)
                        user_id = f"usr_{generate_token()[:8]}"
                        
                        try:
                            execute_db("""
                                INSERT INTO users (id, name, email, phone, role, password_hash, course, assigned_study_plan_id, current_day)
                                VALUES (?, ?, ?, ?, 'student', ?, ?, 'plan_ml_101', 1)
                            """, (user_id, new_name, new_email, new_phone, pass_hash, new_course))
                            
                            send_student_welcome_email(new_email, new_name, temp_pass)
                            st.success(f"Student account created successfully! Credentials sent to **{new_email}** (Temp Password: `{temp_pass}`)")
                        except Exception as e:
                            st.error(f"Error creating user: {e}")
                    else:
                        st.warning("Please provide both name and email.")

    elif "PDF Document Management" in selected_page:
        st.title("📚 PDF Learning Material Management")
        
        col_up, col_list = st.columns([1, 1])
        
        with col_up:
            st.subheader("Upload & Index New PDF")
            uploaded_files = st.file_uploader("Choose PDF File(s)", type=["pdf"], accept_multiple_files=True)
            assign_day = st.number_input("Assign to Study Plan Day", min_value=1, max_value=14, value=1)

            if st.button("Upload and Process Vector Index", type="primary"):
                if uploaded_files:
                    for f in uploaded_files:
                        res = process_and_store_pdf(
                            file_bytes=f.read(),
                            file_name=f.name,
                            uploaded_by=user["id"],
                            study_plan_day=assign_day
                        )
                        st.success(f"Indexed **{f.name}** ({res['page_count']} pages, {res['chunk_count']} vector chunks) for Day {assign_day}.")
                else:
                    st.warning("Select at least one PDF file.")

        with col_list:
            st.subheader("Indexed Documents")
            docs = query_db("SELECT id, name, size, page_count, chunk_count, study_plan_day, uploaded_at FROM documents ORDER BY study_plan_day ASC")
            for doc in docs:
                d = dict(doc)
                st.markdown(f"**📄 {d['name']}** (Day {d['study_plan_day']}) — {d['page_count']} pages, {d['chunk_count']} chunks")

    elif "Exam Creator & Assignments" in selected_page:
        st.title("📝 Exam Creator & Assignments")
        
        t_manual, t_ai, t_assign = st.tabs(["Manual Exam Creator", "🤖 AI Exam Generator", "📌 Assign Exam"])
        
        with t_ai:
            st.subheader("Generate Exam from Knowledge Base using Gemini AI")
            topic = st.text_input("Exam Topic", value="Machine Learning Fundamentals")
            q_count = st.slider("Number of Questions", 3, 10, 5)
            diff = st.selectbox("Difficulty", ["easy", "medium", "hard"])
            
            if st.button("Generate Exam with AI", type="primary"):
                with st.spinner("Gemini AI analyzing documents and generating exam questions..."):
                    result = generate_exam_with_ai(topic, q_count, diff, user["id"])
                    if result:
                        st.success(f"Generated exam **'{result['title']}'** with {len(result['questions'])} questions!")
                    else:
                        st.error("Failed to generate exam via AI.")

        with t_assign:
            st.subheader("Assign Published Exam")
            exams = query_db("SELECT id, title FROM exams")
            students = query_db("SELECT id, name, email FROM users WHERE role = 'student'")
            
            if exams:
                ex_opt = {e["title"]: e["id"] for e in exams}
                sel_ex = st.selectbox("Select Exam", list(ex_opt.keys()))
                sel_st = st.selectbox("Target Student / Group", ["All Students"] + [s["name"] for s in students])

                if st.button("Confirm Assignment"):
                    target_id = None if sel_st == "All Students" else next(s["id"] for s in students if s["name"] == sel_st)
                    assign_exam(ex_opt[sel_ex], user["id"], target_id)
                    st.success(f"Assigned '{sel_ex}' to {sel_st}.")

    elif "Admin AI Assistant" in selected_page:
        st.title("🤖 Admin Teaching Assistant AI")
        st.caption("Ask administrative queries, student performance statistics, or request platform operations.")

        admin_query = st.text_area("Administrative Prompt", value="Which students scored below 80% or need support?")
        if st.button("Run Administrative AI Analysis", type="primary"):
            attempts = query_db("SELECT u.name, ea.percentage FROM exam_attempts ea JOIN users u ON ea.user_id = u.id")
            att_str = "\n".join([f"- {a['name']}: {a['percentage']}%" for a in attempts]) or "No attempts logged."
            
            prompt = f"Platform Performance Context:\n{att_str}\n\nAdmin Query: {admin_query}"
            res = generate_text(prompt, system_instruction="You are the Senior Talent Sphere AI Platform Administrator Assistant. Provide clear administrative analytics.")
            st.markdown(f"### AI Analysis\n{res}")

    elif "Announcements & Alerts" in selected_page:
        st.title("📢 Announcements & System Notices")
        
        with st.form("new_announcement"):
            ann_title = st.text_input("Announcement Title")
            ann_content = st.text_area("Content")
            ann_prio = st.selectbox("Priority", ["normal", "important", "high"])
            if st.form_submit_button("Publish Announcement"):
                if ann_title and ann_content:
                    execute_db("""
                        INSERT INTO announcements (id, title, content, priority, created_by)
                        VALUES (?, ?, ?, ?, ?)
                    """, (f"ann_{generate_token()[:8]}", ann_title, ann_content, ann_prio, user["id"]))
                    st.success("Announcement published successfully!")

    elif "Platform Analytics" in selected_page:
        st.title("📈 Platform Analytics & Insights")
        fig = create_admin_performance_chart()
        st.plotly_chart(fig, use_container_width=True)

# =========================================================
# STUDENT ROLE PORTAL
# =========================================================
else:
    plan_data = get_user_study_plan(user["id"])
    cur_day = plan_data.get("current_day", 1)

    if "Student Dashboard" in selected_page:
        st.title(f"👋 Welcome back, {user['name']}!")
        
        c1, c2, c3 = st.columns(3)
        with c1:
            st.markdown(f"<div class='metric-card'><div class='metric-label'>Current Study Day</div><div class='metric-value'>Day {cur_day} of {plan_data.get('total_days', 7)}</div></div>", unsafe_allow_html=True)
        with c2:
            st.markdown(f"<div class='metric-card'><div class='metric-label'>Overall Course</div><div class='metric-value'>{user.get('course', 'Machine Learning 101')}</div></div>", unsafe_allow_html=True)
        with c3:
            st.markdown(f"<div class='metric-card'><div class='metric-label'>Assigned Study Plan</div><div class='metric-value'>{plan_data.get('title', 'ML Mastery')}</div></div>", unsafe_allow_html=True)

        st.subheader("Visual Study Plan Progression")
        fig = create_student_progress_chart(user["id"])
        st.plotly_chart(fig, use_container_width=True)

    elif "Today's Learning Materials" in selected_page:
        st.title(f"📖 Day {cur_day} Learning Materials")
        
        for d in plan_data.get("days", []):
            day_num = d["day_number"]
            status = d["status"]
            
            st.markdown(f"### Day {day_num}: {d['title']} — `{status.upper()}`")
            
            if status == "locked":
                st.warning(f"🔒 Day {day_num} is locked. Complete previous days to unlock.")
            else:
                docs = d.get("documents", [])
                if docs:
                    for doc in docs:
                        st.markdown(f"📄 **{doc['name']}** — Summary: {doc['summary']}")
                        st.download_button(
                            label=f"📥 Download {doc['name']}",
                            data=b"Sample PDF Content for " + doc['name'].encode('utf-8'),
                            file_name=doc['name'],
                            mime="application/pdf"
                        )
                else:
                    st.info("No PDF materials attached for this day.")
                
                if status == "unlocked" and st.button(f"Mark Day {day_num} Completed & Unlock Next Day", key=f"btn_comp_{day_num}", type="primary"):
                    complete_day(user["id"], day_num)
                    st.success(f"Day {day_num} marked as complete! Day {day_num + 1} is now unlocked.")
                    st.rerun()

    elif "Student AI Tutor" in selected_page:
        st.title("🤖 Student AI Tutor")
        st.caption(f"Answering questions strictly from your unlocked study materials (up to Day {cur_day}).")

        q_input = st.text_input("Ask a question about your learning materials", value="What is supervised learning?")
        if st.button("Ask AI Tutor", type="primary"):
            context_chunks = vector_store.retrieve_authorized_chunks(q_input, user_current_day=cur_day, top_k=4)
            if not context_chunks:
                st.info("I couldn't find that information in your currently unlocked learning materials.")
            else:
                ctx_text = "\n\n".join([f"[Source: {c['doc_name']}, Page {c['page_number']}]\n{c['content']}" for c in context_chunks])
                prompt = f"Document Context:\n{ctx_text}\n\nStudent Query: {q_input}"
                res = generate_text(prompt, system_instruction="You are the Student AI Tutor. Answer thoroughly using ONLY the provided document context.")
                st.markdown(f"### AI Answer\n{res}")

    elif "AI Voice Interviewer" in selected_page:
        st.title("🎙️ Final Day AI Voice Interviewer")
        st.caption("Adaptive technical voice interview based on your unlocked learning materials.")

        if "interview_history" not in st.session_state:
            st.session_state.interview_history = []

        if st.button("Start / Reset Voice Interview", type="primary"):
            st.session_state.interview_history = []
            res = conduct_voice_interview_step(user["id"], cur_day, st.session_state.interview_history)
            st.session_state.interview_history.append({"role": "assistant", "content": res["ai_response_text"]})
            st.rerun()

        for msg in st.session_state.interview_history:
            st.chat_message(msg["role"]).write(msg["content"])

        ans = st.text_input("Your Spoken / Text Response")
        if st.button("Submit Answer"):
            if ans:
                st.session_state.interview_history.append({"role": "user", "content": ans})
                res = conduct_voice_interview_step(user["id"], cur_day, st.session_state.interview_history, ans)
                st.session_state.interview_history.append({"role": "assistant", "content": res["ai_response_text"]})
                
                if res.get("audio_file") and os.path.exists(res["audio_file"]):
                    st.audio(res["audio_file"])
                
                if res.get("is_complete") and res.get("evaluation"):
                    st.balloons()
                    st.success("Interview Completed! Score & Evaluation report generated.")
                st.rerun()

    elif "My Exams & Assessments" in selected_page:
        st.title("✍️ Assigned Exams & Assessments")
        assignments = query_db("""
            SELECT ea.id as assignment_id, e.id as exam_id, e.title, e.duration_minutes
            FROM exam_assignments ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE ea.user_id = ? OR ea.user_id IS NULL
        """, (user["id"],))

        if not assignments:
            st.info("No exams currently assigned.")
        else:
            for asgn in assignments:
                a = dict(asgn)
                st.markdown(f"### 📝 {a['title']} ({a['duration_minutes']} mins)")
                
                q_rows = query_db("SELECT * FROM exam_questions WHERE exam_id = ?", (a["exam_id"],))
                answers = {}
                with st.form(f"exam_form_{a['assignment_id']}"):
                    for idx, q in enumerate(q_rows):
                        q_dict = dict(q)
                        opts = json.loads(q_dict.get("options_json") or "[]")
                        if opts:
                            answers[q_dict["id"]] = st.radio(f"Q{idx+1}: {q_dict['question_text']}", opts, key=f"q_{q_dict['id']}")
                        else:
                            answers[q_dict["id"]] = st.text_input(f"Q{idx+1}: {q_dict['question_text']}", key=f"q_{q_dict['id']}")
                    
                    if st.form_submit_button("Submit Exam"):
                        res = submit_exam_attempt(a["assignment_id"], user["id"], a["exam_id"], answers, 300)
                        st.success(f"Exam Submitted! Score: {res['score']}/{res['total_marks']} ({res['percentage']}%)")

    elif "Announcements" in selected_page:
        st.title("📢 Platform Announcements")
        anns = query_db("SELECT * FROM announcements ORDER BY published_at DESC")
        for ann in anns:
            st.info(f"**{ann['title']}**\n\n{ann['content']}")

    elif "My Study Progress" in selected_page:
        st.title("📊 My Study Progress & Performance")
        fig = create_student_progress_chart(user["id"])
        st.plotly_chart(fig, use_container_width=True)
