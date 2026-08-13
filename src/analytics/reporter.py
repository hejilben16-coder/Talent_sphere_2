import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from typing import List, Dict, Any
from src.database.db import query_db

def create_student_progress_chart(user_id: str) -> go.Figure:
    rows = query_db("""
        SELECT day_number, status FROM user_study_progress
        WHERE user_id = ? ORDER BY day_number ASC
    """, (user_id,))
    
    if not rows:
        days = list(range(1, 8))
        statuses = ["completed", "unlocked"] + ["locked"] * 5
    else:
        days = [r["day_number"] for r in rows]
        statuses = [r["status"] for r in rows]

    colors = {
        "completed": "#10b981", # Emerald green
        "unlocked": "#3b82f6",  # Sapphire blue
        "locked": "#9ca3af"     # Neutral gray
    }
    
    df = pd.DataFrame({"Day": [f"Day {d}" for d in days], "Status": statuses, "Value": [1] * len(days)})
    
    fig = px.bar(
        df,
        x="Day",
        y="Value",
        color="Status",
        color_discrete_map=colors,
        title="7-Day Study Plan Progression",
        labels={"Value": "Progress"},
        height=300
    )
    fig.update_layout(
        showlegend=True,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif"),
        yaxis=dict(showticklabels=False)
    )
    return fig

def create_admin_performance_chart() -> go.Figure:
    attempts = query_db("SELECT percentage, submitted_at FROM exam_attempts ORDER BY submitted_at ASC")
    if not attempts:
        df = pd.DataFrame({
            "Attempt": ["Student A", "Student B", "Student C", "Student D"],
            "Score": [85, 92, 78, 88]
        })
    else:
        scores = [a["percentage"] for a in attempts]
        df = pd.DataFrame({
            "Attempt": [f"Attempt #{i+1}" for i in range(len(scores))],
            "Score": scores
        })

    fig = px.line(
        df,
        x="Attempt",
        y="Score",
        markers=True,
        title="Recent Exam Score Distribution (%)",
        color_discrete_sequence=["#2563eb"],
        height=320
    )
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif"),
        yaxis=dict(range=[0, 100])
    )
    return fig
