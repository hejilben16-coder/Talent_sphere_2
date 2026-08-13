export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  content: string;
  embedding?: number[];
}

export interface PDFDocument {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  pageCount: number;
  chunkCount: number;
  uploadedBy: string;
  summary?: string;
  status: 'ready' | 'processing' | 'error';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: {
    docName: string;
    pageNumber: number;
    snippet: string;
    score: number;
  }[];
}

export type QuestionType = 'mcq' | 'short' | 'long' | 'true_false' | 'fill_in_blank';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For MCQ or True/False
  correctAnswer: string;
  explanation: string;
  sourceDocName: string;
  sourcePage: number;
  difficulty: DifficultyLevel;
  bloomsLevel: 'Remembering' | 'Understanding' | 'Applying' | 'Analyzing' | 'Evaluating' | 'Creating';
  points: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  sourceDocIds: string[];
  docNames: string[];
  totalQuestions: number;
  durationMinutes: number;
  questions: ExamQuestion[];
  createdBy: string;
  createdAt: string;
}

export interface QuestionAnswerAttempt {
  questionId: string;
  studentAnswer: string;
  isCorrect?: boolean;
  scoreEarned?: number;
  aiFeedback?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  startedAt: string;
  submittedAt?: string;
  score: number;
  totalPossibleScore: number;
  percentage: number;
  answers: QuestionAnswerAttempt[];
  aiOverallFeedback?: string;
  weakTopics?: string[];
  strongTopics?: string[];
}

export interface StudyCoachData {
  studentId: string;
  studyStreakDays: number;
  weakTopics: { topic: string; docName: string; scorePct: number }[];
  strongTopics: { topic: string; docName: string; scorePct: number }[];
  revisionPlan: { day: string; task: string; pdfName: string }[];
  flashcards: { id: string; front: string; back: string; topic: string }[];
  recommendedPdfs: { docId: string; docName: string; reason: string }[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'login' | 'logout' | 'upload_pdf' | 'delete_pdf' | 'chat' | 'generate_exam' | 'take_exam' | 'user_manage' | 'settings_update' | 'error';
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface SystemSettings {
  llmModel: string;
  embeddingModel: string;
  temperature: number;
  chunkSize: number;
  chunkOverlap: number;
  topKRetrieval: number;
  theme: 'dark' | 'light' | 'system';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  chatSessionsCount: number;
  pdfUploadsCount: number;
  totalKnowledgePages: number;
  examsGeneratedCount: number;
  examsAttemptedCount: number;
  averageExamScore: number;
  recentActivity: ActivityLog[];
  topPdfs: { docName: string; queriesCount: number }[];
}

export interface StudyDayModule {
  dayNumber: number;
  title: string;
  objective: string;
  documents: string[];
  quizzes: string[];
}

export interface WeeklyStudyPlan {
  id: string;
  title: string;
  description: string;
  category: string;
  weeksCount: number;
  totalDays: number;
  isPublished: boolean;
  isActiveDefault?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  days: StudyDayModule[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Important' | 'Exam Notice' | 'Course Update' | 'Maintenance' | 'General';
  targetRole: 'all' | 'student' | 'admin';
  isPinned: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface UserCreatePayload {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  sendEmailNotice?: boolean;
}

export interface UserCreateResponse {
  user: User;
  generatedPassword?: string;
  emailSent: boolean;
  emailMessage?: string;
}

export interface StudentAnalytics {
  totalExamsTaken: number;
  averageScorePct: number;
  studyTimeHours: number;
  studyStreakDays: number;
  scoreTrend: { date: string; scorePct: number; examTitle: string }[];
  topicMastery: { topic: string; masteryPct: number }[];
}
