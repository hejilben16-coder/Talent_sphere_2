import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  PDFDocument,
  DocumentChunk,
  ChatMessage,
  Exam,
  ExamAttempt,
  ActivityLog,
  SystemSettings,
  WeeklyStudyPlan,
  Announcement,
  VoiceInterviewSubmission
} from '../src/types.js';

const DB_DIR = path.join(process.cwd(), 'database');
const DB_FILE = path.join(DB_DIR, 'data.json');
const UPLOAD_DIR = path.join(process.cwd(), 'uploaded_pdfs');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  documents: PDFDocument[];
  chunks: DocumentChunk[];
  chats: { id: string; userId: string; messages: ChatMessage[] }[];
  exams: Exam[];
  attempts: ExamAttempt[];
  activityLogs: ActivityLog[];
  notifications: import('../src/types.js').Notification[];
  settings: SystemSettings;
  plans: WeeklyStudyPlan[];
  announcements: Announcement[];
  interviews?: VoiceInterviewSubmission[];
}

const defaultSettings: SystemSettings = {
  llmModel: 'gemini-2.5-flash',
  embeddingModel: 'text-embedding-004',
  temperature: 0.3,
  chunkSize: 800,
  chunkOverlap: 150,
  topKRetrieval: 4,
  theme: 'dark'
};

let db: DatabaseSchema;

function saveDatabase(dataToSave?: DatabaseSchema) {
  if (dataToSave) {
    db = dataToSave;
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function initDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        users: parsed.users || [],
        documents: parsed.documents || [],
        chunks: parsed.chunks || [],
        chats: parsed.chats || [],
        exams: parsed.exams || [],
        attempts: parsed.attempts || [],
        activityLogs: parsed.activityLogs || [],
        settings: { ...defaultSettings, ...(parsed.settings || {}) },
        plans: parsed.plans || [],
        announcements: parsed.announcements || []
      };
    } catch (e) {
      console.error('Failed to parse database file, resetting to default.', e);
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('AdminPass123!', salt);
  const studentPasswordHash = bcrypt.hashSync('StudentPass123!', salt);

  const initialUsers: (User & { passwordHash: string })[] = [
    {
      id: 'usr_admin_1',
      name: 'System Admin',
      email: 'admin@talentsphere.ai',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: adminPasswordHash
    },
    {
      id: 'usr_student_1',
      name: 'Alex Rivera',
      email: 'student@talentsphere.ai',
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: studentPasswordHash
    }
  ];

  const initialDocs: PDFDocument[] = [
    {
      id: 'doc_ml101',
      name: 'Machine Learning 101 Foundations.pdf',
      size: 1048576,
      uploadedAt: new Date().toISOString(),
      pageCount: 3,
      chunkCount: 3,
      uploadedBy: 'usr_admin_1',
      summary: 'Comprehensive guide to Supervised vs Unsupervised learning, Model Evaluation metrics, and Gradient Descent fundamentals.',
      status: 'ready'
    },
    {
      id: 'doc_rag202',
      name: 'AI Software Engineering & RAG Handbook.pdf',
      size: 2097152,
      uploadedAt: new Date().toISOString(),
      pageCount: 3,
      chunkCount: 3,
      uploadedBy: 'usr_admin_1',
      summary: 'Architecture manual for Retrieval-Augmented Generation, Vector Embeddings, Cosine Distance, and LLM Prompt Engineering.',
      status: 'ready'
    }
  ];

  const initialChunks: DocumentChunk[] = [
    {
      id: 'chk_ml101_1',
      docId: 'doc_ml101',
      docName: 'Machine Learning 101 Foundations.pdf',
      pageNumber: 1,
      content: 'Supervised learning relies on labeled training datasets (input features paired with target outputs) to train predictive models like linear regression, decision trees, and neural networks. Key metrics include accuracy, precision, recall, and F1-score.'
    },
    {
      id: 'chk_ml101_2',
      docId: 'doc_ml101',
      docName: 'Machine Learning 101 Foundations.pdf',
      pageNumber: 2,
      content: 'Unsupervised learning discovers hidden structures and patterns within unlabeled data. Key techniques include K-means clustering, Principal Component Analysis (PCA) for dimensionality reduction, and anomaly detection algorithms.'
    },
    {
      id: 'chk_ml101_3',
      docId: 'doc_ml101',
      docName: 'Machine Learning 101 Foundations.pdf',
      pageNumber: 3,
      content: 'Gradient Descent is an optimization algorithm used to minimize the loss function by iteratively moving in the direction of steepest descent. Learning rate controls step size, avoiding overshooting or slow convergence.'
    },
    {
      id: 'chk_rag202_1',
      docId: 'doc_rag202',
      docName: 'AI Software Engineering & RAG Handbook.pdf',
      pageNumber: 1,
      content: 'Retrieval-Augmented Generation (RAG) connects Large Language Models (LLMs) to external vector databases. By fetching context-relevant document chunks, RAG eliminates LLM hallucinations and provides accurate, source-cited responses.'
    },
    {
      id: 'chk_rag202_2',
      docId: 'doc_rag202',
      docName: 'AI Software Engineering & RAG Handbook.pdf',
      pageNumber: 2,
      content: 'Vector Embeddings map text into multi-dimensional numerical vector spaces. Cosine Similarity calculates the angle between vector pairs, measuring semantic similarity regardless of vector magnitude.'
    },
    {
      id: 'chk_rag202_3',
      docId: 'doc_rag202',
      docName: 'AI Software Engineering & RAG Handbook.pdf',
      pageNumber: 3,
      content: 'Prompt Engineering strategies include zero-shot, few-shot exemplars, and chain-of-thought reasoning prompts to guide generative AI outputs with strict structured JSON constraints.'
    }
  ];

  const initialExams: Exam[] = [
    {
      id: 'exam_ml_foundations',
      title: 'Machine Learning & AI Architecture Assessment',
      description: 'Comprehensive diagnostic exam covering Supervised ML, RAG vector retrieval, and Gradient Descent.',
      sourceDocIds: ['doc_ml101', 'doc_rag202'],
      docNames: ['Machine Learning 101 Foundations.pdf', 'AI Software Engineering & RAG Handbook.pdf'],
      totalQuestions: 4,
      durationMinutes: 20,
      createdBy: 'usr_admin_1',
      createdAt: new Date().toISOString(),
      questions: [
        {
          id: 'q_1',
          type: 'mcq',
          question: 'Which machine learning paradigm uses labeled training datasets pairing input features with target outputs?',
          options: ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning', 'Zero-Shot Prompting'],
          correctAnswer: 'Supervised Learning',
          explanation: 'Supervised learning requires labeled training data to learn mapping functions from inputs to targets.',
          sourceDocName: 'Machine Learning 101 Foundations.pdf',
          sourcePage: 1,
          difficulty: 'Easy',
          bloomsLevel: 'Remembering',
          points: 25
        },
        {
          id: 'q_2',
          type: 'mcq',
          question: 'How does Retrieval-Augmented Generation (RAG) prevent LLM hallucinations?',
          options: [
            'By retraining the entire model parameters from scratch',
            'By fetching relevant context chunks from a vector knowledge base to ground AI responses',
            'By increasing the temperature setting to 1.0',
            'By disabling source citations'
          ],
          correctAnswer: 'By fetching relevant context chunks from a vector knowledge base to ground AI responses',
          explanation: 'RAG retrieves factual knowledge chunks from vector databases and injects them directly into the LLM prompt context.',
          sourceDocName: 'AI Software Engineering & RAG Handbook.pdf',
          sourcePage: 1,
          difficulty: 'Medium',
          bloomsLevel: 'Understanding',
          points: 25
        },
        {
          id: 'q_3',
          type: 'mcq',
          question: 'What metric is computed to measure semantic similarity between two vector embeddings in high-dimensional space?',
          options: ['Cosine Similarity', 'Hamming Distance', 'Euclidean Norm Square', 'Bitwise XOR'],
          correctAnswer: 'Cosine Similarity',
          explanation: 'Cosine similarity measures the cosine of the angle between two multi-dimensional embedding vectors.',
          sourceDocName: 'AI Software Engineering & RAG Handbook.pdf',
          sourcePage: 2,
          difficulty: 'Medium',
          bloomsLevel: 'Applying',
          points: 25
        },
        {
          id: 'q_4',
          type: 'short',
          question: 'Explain why the learning rate hyperparameter is critical during Gradient Descent optimization.',
          correctAnswer: 'The learning rate determines step size towards the loss function minimum; too large overshoots, too small converges slowly.',
          explanation: 'Optimal learning rates ensure fast, stable convergence without oscillating or exploding gradients.',
          sourceDocName: 'Machine Learning 101 Foundations.pdf',
          sourcePage: 3,
          difficulty: 'Hard',
          bloomsLevel: 'Analyzing',
          points: 25
        }
      ]
    }
  ];

  const initialAttempts: ExamAttempt[] = [
    {
      id: 'att_demo_1',
      examId: 'exam_ml_foundations',
      examTitle: 'Machine Learning & AI Architecture Assessment',
      studentId: 'usr_student_1',
      studentName: 'Alex Rivera',
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      submittedAt: new Date(Date.now() - 82800000).toISOString(),
      score: 75,
      totalPossibleScore: 100,
      percentage: 75,
      answers: [],
      aiOverallFeedback: 'Strong understanding of Supervised Learning and RAG architecture.',
      weakTopics: ['Gradient Descent Learning Rate Optimization'],
      strongTopics: ['Supervised Learning', 'RAG Vector Search']
    }
  ];

  const initialPlans: WeeklyStudyPlan[] = [
    {
      id: 'plan_ml_7day',
      title: '7-Day Machine Learning & RAG Engineering Mastery',
      description: 'Comprehensive 1-week track covering supervised ML, vector embeddings, RAG architectures, and adaptive technical voice interviews.',
      category: 'Machine Learning & RAG',
      weeksCount: 1,
      totalDays: 7,
      isPublished: true,
      isActiveDefault: true,
      createdBy: 'usr_admin_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      days: [
        {
          dayNumber: 1,
          title: 'Day 1: Supervised & Unsupervised Machine Learning Fundamentals',
          objective: 'Master linear models, loss functions, gradient descent, and supervised vs unsupervised paradigms.',
          documents: ['Machine Learning 101 Foundations.pdf'],
          quizzes: ['Diagnostic ML Foundations Quiz']
        },
        {
          dayNumber: 2,
          title: 'Day 2: Neural Networks & Deep Learning Architecture',
          objective: 'Understand backpropagation, activation functions (ReLU, Sigmoid), and multi-layer perceptrons.',
          documents: ['AI Software Engineering Handbook.pdf'],
          quizzes: ['Neural Networks Architecture Practice']
        },
        {
          dayNumber: 3,
          title: 'Day 3: Vector Embeddings & Similarity Search',
          objective: 'Learn high-dimensional vector representations, cosine distance, and vector databases.',
          documents: ['AI Software Engineering Handbook.pdf'],
          quizzes: ['Vector Search Assessment']
        },
        {
          dayNumber: 4,
          title: 'Day 4: Retrieval-Augmented Generation (RAG) Systems',
          objective: 'Study RAG pipeline architecture, chunking strategies, and source citation synthesis.',
          documents: ['AI Software Engineering Handbook.pdf'],
          quizzes: ['RAG Pipeline Implementation Exam']
        },
        {
          dayNumber: 5,
          title: 'Day 5: LLM Fine-Tuning & Prompt Engineering',
          objective: 'Master zero-shot, few-shot prompting, LoRA parameter-efficient fine-tuning, and alignment.',
          documents: ['AI Software Engineering Handbook.pdf'],
          quizzes: ['Prompt Engineering Practice']
        },
        {
          dayNumber: 6,
          title: 'Day 6: AI Model Evaluation & Bias Detection',
          objective: 'Evaluate precision, recall, F1-score, ROC-AUC curves, and ethical AI auditing.',
          documents: ['Machine Learning 101 Foundations.pdf'],
          quizzes: ['Model Evaluation & Safety Assessment']
        },
        {
          dayNumber: 7,
          title: 'Day 7: Final Comprehensive Voice Interview & Capstone',
          objective: 'Complete the adaptive AI technical voice interview and final platform capstone project.',
          documents: ['AI Software Engineering Handbook.pdf'],
          quizzes: ['Final Adaptive Technical Voice Interview']
        }
      ]
    },
    {
      id: 'plan_fullstack_2wk',
      title: '14-Day Full-Stack AI Software Engineering Track',
      description: 'An intensive 2-week curriculum focusing on Express backend APIs, Vector DB integration, custom LLM agents, and hands-free voice interviews.',
      category: 'Full-Stack AI Engineering',
      weeksCount: 2,
      totalDays: 14,
      isPublished: true,
      isActiveDefault: false,
      createdBy: 'usr_admin_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      days: Array.from({ length: 14 }, (_, i) => ({
        dayNumber: i + 1,
        title: `Day ${i + 1}: ${i < 7 ? 'Phase 1 - Core AI Vector Foundations' : 'Phase 2 - Agentic Systems & Hands-Free Voice Integration'} (Lesson ${i + 1})`,
        objective: `Comprehensive module ${i + 1} with practical hands-on exercises and source citations.`,
        documents: [i % 2 === 0 ? 'Machine Learning 101 Foundations.pdf' : 'AI Software Engineering Handbook.pdf'],
        quizzes: [`Progress Quiz Day ${i + 1}`]
      }))
    }
  ];

  const initialAnnouncements: Announcement[] = [
    {
      id: 'ann_welcome',
      title: '🎉 Welcome to Talent Sphere AI Platform!',
      content: 'Explore our multi-week study plans, uploaded PDF knowledge store, diagnostic exams, and interactive AI voice interview portal.',
      category: 'General',
      targetRole: 'all',
      isPinned: true,
      createdBy: 'usr_admin_1',
      createdByName: 'System Admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ann_new_plan',
      title: '📢 Unlimited Custom Weekly Plans Enabled',
      content: 'Admins can now publish unlimited custom weekly study plans for students. Check out the 14-Day Full-Stack AI track!',
      category: 'Course Update',
      targetRole: 'all',
      isPinned: false,
      createdBy: 'usr_admin_1',
      createdByName: 'System Admin',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  const initialData: DatabaseSchema = {
    users: initialUsers,
    documents: initialDocs,
    chunks: initialChunks,
    chats: [],
    exams: initialExams,
    attempts: initialAttempts,
    activityLogs: [
      {
        id: 'log_init',
        userId: 'usr_admin_1',
        userName: 'System Admin',
        userRole: 'admin',
        action: 'login',
        details: 'Talent Sphere AI Database Initialized with Seed Knowledge Base & Exams',
        timestamp: new Date().toISOString()
      }
    ],
<<<<<<< Updated upstream
    settings: defaultSettings,
    plans: initialPlans,
    announcements: initialAnnouncements
=======
    notifications: [],
    settings: defaultSettings
>>>>>>> Stashed changes
  };

  saveDatabase(initialData);
  return initialData;
}

db = initDatabase();

export const dbStore = {
  getUsers: () => db.users,
  getUserByEmail: (email: string) => db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  getUserById: (id: string) => db.users.find((u) => u.id === id),
  addUser: (user: User & { passwordHash: string }) => {
    db.users.push(user);
    saveDatabase();
  },
  updateUser: (id: string, updates: Partial<User & { passwordHash?: string }>) => {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...updates };
      saveDatabase();
    }
  },
  deleteUser: (id: string) => {
    db.users = db.users.filter((u) => u.id !== id);
    saveDatabase();
  },

  getDocuments: () => db.documents,
  getDocumentById: (id: string) => db.documents.find((d) => d.id === id),
  addDocument: (doc: PDFDocument, chunks: DocumentChunk[]) => {
    db.documents = db.documents.filter((d) => d.id !== doc.id && d.name !== doc.name);
    db.documents.push(doc);
    db.chunks = db.chunks.filter((c) => c.docId !== doc.id && c.docName !== doc.name);
    db.chunks.push(...chunks);
    saveDatabase();
  },
  deleteDocument: (id: string) => {
    const doc = db.documents.find((d) => d.id === id);
    db.documents = db.documents.filter((d) => d.id !== id);
    db.chunks = db.chunks.filter((c) => c.docId !== id);
    if (doc) {
      const filePath = path.join(UPLOAD_DIR, `${doc.id}.pdf`);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
    saveDatabase();
  },

  getChunks: () => db.chunks,
  getChunksByDocId: (docId: string) => db.chunks.filter((c) => c.docId === docId),

  getChatHistory: (userId: string) => {
    const userChat = db.chats.find((c) => c.userId === userId);
    return userChat ? userChat.messages : [];
  },
  addChatMessage: (userId: string, msg: ChatMessage) => {
    let userChat = db.chats.find((c) => c.userId === userId);
    if (!userChat) {
      userChat = { id: `chat_${Date.now()}`, userId, messages: [] };
      db.chats.push(userChat);
    }
    userChat.messages.push(msg);
    saveDatabase();
  },
  clearChatHistory: (userId: string) => {
    db.chats = db.chats.filter((c) => c.userId !== userId);
    saveDatabase();
  },

  getExams: () => db.exams,
  getExamById: (id: string) => db.exams.find((e) => e.id === id),
  addExam: (exam: Exam) => {
    db.exams.push(exam);
    saveDatabase();
  },
  deleteExam: (id: string) => {
    db.exams = db.exams.filter((e) => e.id !== id);
    db.attempts = db.attempts.filter((a) => a.examId !== id);
    saveDatabase();
  },

  getAttempts: (studentId?: string) => {
    if (studentId) {
      return db.attempts.filter((a) => a.studentId === studentId);
    }
    return db.attempts;
  },
  addAttempt: (attempt: ExamAttempt) => {
    db.attempts.push(attempt);
    saveDatabase();
  },

  getActivityLogs: () => db.activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  logActivity: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    db.activityLogs.push(newLog);
    saveDatabase();
  },

  // Notifications / Announcements
  getNotifications: (userId?: string) => {
    if (!userId) return db.notifications || [];
    return (db.notifications || []).filter((n) => n.target === 'all' || n.target === userId);
  },
  addNotification: (note: { title: string; message: string; createdBy?: string; target?: 'all' | string }) => {
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: note.title,
      message: note.message,
      createdAt: new Date().toISOString(),
      createdBy: note.createdBy || 'system',
      target: note.target || 'all',
      readBy: []
    } as import('../src/types.js').Notification;
    db.notifications = db.notifications || [];
    db.notifications.unshift(newNote);
    saveDatabase();
    return newNote;
  },
  markNotificationRead: (noteId: string, userId: string) => {
    const note = (db.notifications || []).find((n) => n.id === noteId);
    if (!note) return false;
    note.readBy = note.readBy || [];
    if (!note.readBy.includes(userId)) note.readBy.push(userId);
    saveDatabase();
    return true;
  },
  deleteNotification: (noteId: string) => {
    db.notifications = (db.notifications || []).filter((n) => n.id !== noteId);
    saveDatabase();
  },

  getSettings: () => db.settings,
  updateSettings: (newSettings: Partial<SystemSettings>) => {
    db.settings = { ...db.settings, ...newSettings };
    saveDatabase();
  },

  // Weekly Study Plans
  getPlans: () => db.plans || [],
  getPlanById: (id: string) => (db.plans || []).find((p) => p.id === id),
  savePlan: (plan: WeeklyStudyPlan) => {
    if (!db.plans) db.plans = [];
    const idx = db.plans.findIndex((p) => p.id === plan.id);
    if (idx !== -1) {
      db.plans[idx] = plan;
    } else {
      db.plans.push(plan);
    }
    saveDatabase();
  },
  deletePlan: (id: string) => {
    if (!db.plans) return;
    db.plans = db.plans.filter((p) => p.id !== id);
    saveDatabase();
  },
  setDefaultPlan: (id: string) => {
    if (!db.plans) return;
    db.plans = db.plans.map((p) => ({
      ...p,
      isActiveDefault: p.id === id
    }));
    saveDatabase();
  },

  // Announcements
  getAnnouncements: () => (db.announcements || []).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }),
  addAnnouncement: (announcement: Announcement) => {
    if (!db.announcements) db.announcements = [];
    db.announcements.unshift(announcement);
    saveDatabase();
  },
  deleteAnnouncement: (id: string) => {
    if (!db.announcements) return;
    db.announcements = db.announcements.filter((a) => a.id !== id);
    saveDatabase();
  },
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => {
    if (!db.announcements) return;
    const idx = db.announcements.findIndex((a) => a.id === id);
    if (idx !== -1) {
      db.announcements[idx] = { ...db.announcements[idx], ...updates };
      saveDatabase();
    }
  },

  // Voice Interview Submissions
  getInterviews: () => db.interviews || [],
  getStudentInterviews: (studentId: string) => (db.interviews || []).filter((i) => i.studentId === studentId),
  addInterview: (submission: VoiceInterviewSubmission) => {
    if (!db.interviews) db.interviews = [];
    db.interviews.unshift(submission);
    saveDatabase();
  },

  resetDatabase: () => {
    if (fs.existsSync(DB_FILE)) {
      try { fs.unlinkSync(DB_FILE); } catch (_) {}
    }
    db = initDatabase();
  }
};
