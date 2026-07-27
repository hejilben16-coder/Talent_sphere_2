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
  SystemSettings
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
  settings: SystemSettings;
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
        settings: { ...defaultSettings, ...(parsed.settings || {}) }
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

  const initialData: DatabaseSchema = {
    users: initialUsers,
    documents: [],
    chunks: [],
    chats: [],
    exams: [],
    attempts: [],
    activityLogs: [
      {
        id: 'log_init',
        userId: 'usr_admin_1',
        userName: 'System Admin',
        userRole: 'admin',
        action: 'login',
        details: 'Talent Sphere AI Database Initialized',
        timestamp: new Date().toISOString()
      }
    ],
    settings: defaultSettings
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

  getSettings: () => db.settings,
  updateSettings: (newSettings: Partial<SystemSettings>) => {
    db.settings = { ...db.settings, ...newSettings };
    saveDatabase();
  },
  resetDatabase: () => {
    if (fs.existsSync(DB_FILE)) {
      try { fs.unlinkSync(DB_FILE); } catch (_) {}
    }
    db = initDatabase();
  }
};
