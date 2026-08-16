import os
import json
import streamlit as st
from typing import List
from rag_engine import PyRAGEngine

BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploaded_pdfs')
NOTES_FILE = os.path.join(BASE_DIR, 'notifications.json')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def load_notifications() -> List[dict]:
    if not os.path.exists(NOTES_FILE):
        return []
    try:
        with open(NOTES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_notification(note: dict):
    notes = load_notifications()
    notes.insert(0, note)
    with open(NOTES_FILE, 'w', encoding='utf-8') as f:
        json.dump(notes, f, indent=2)


def main():
    st.set_page_config(page_title='Talent Sphere — Streamlit', layout='wide')

    st.sidebar.title('Talent Sphere (Streamlit)')
    role = st.sidebar.selectbox('Role', ['admin', 'student'])

    st.sidebar.markdown('Demo credentials:')
    st.sidebar.text('admin@talentsphere.ai / AdminPass123!')
    st.sidebar.text('student@talentsphere.ai / StudentPass123!')

    # show latest announcement
    notes = load_notifications()
    if notes:
        latest = notes[0]
        st.sidebar.success(f"{latest.get('title')}: {latest.get('message')}")

    engine = PyRAGEngine(upload_dir=UPLOAD_DIR)

    st.title('Talent Sphere — Streamlit UI')

    tabs = st.tabs(['Documents', 'Chat', 'Admin'])

    # Documents Tab
    with tabs[0]:
        st.header('PDF Knowledge Base')
        col1, col2 = st.columns([1, 2])
        with col1:
            st.subheader('Upload')
            if role != 'admin':
                st.info('PDF upload is restricted to admins.')
            uploaded = st.file_uploader('Upload PDF(s)', type=['pdf'], accept_multiple_files=True, key='uploader')
            if uploaded and role == 'admin':
                for up in uploaded:
                    bytes_data = up.read()
                    res = engine.process_pdf(bytes_data, up.name, user_id='streamlit_admin')
                    st.success(f"Processed {up.name}: {res['chunkCount']} chunks")

            st.subheader('Available Documents')
            docs = engine.documents
            if not docs:
                st.write('No documents processed yet.')
            else:
                for d in docs:
                    with st.expander(f"{d['name']} — {d['chunkCount']} chunks"):
                        st.write(d)

    # Chat Tab
    with tabs[1]:
        st.header('RAG Assistant Chat')
        query = st.text_input('Enter your question about uploaded PDFs')
        if st.button('Ask') and query:
            with st.spinner('Retrieving relevant content...'):
                resp = engine.answer_query(query)
            st.subheader('Answer')
            st.markdown(resp.get('answer', 'No answer'))
            sources = resp.get('sources', [])
            if sources:
                st.subheader('Sources')
                for s in sources:
                    st.write(f"{s.get('docName')} — p.{s.get('pageNumber')} — {s.get('snippet')}")

    # Admin Tab
    with tabs[2]:
        st.header('Administration')
        if role != 'admin':
            st.warning('Admin controls are hidden for non-admins.')
        else:
            st.subheader('Post Announcement')
            a_title = st.text_input('Announcement title')
            a_msg = st.text_area('Announcement message')
            if st.button('Post Announcement'):
                if not a_title or not a_msg:
                    st.error('Title and message are required')
                else:
                    note = {'title': a_title, 'message': a_msg}
                    save_notification(note)
                    st.success('Announcement posted')

            st.subheader('Index Diagnostics')
            st.write({'documents': len(engine.documents), 'chunks': len(engine.chunks)})


if __name__ == '__main__':
    main()
