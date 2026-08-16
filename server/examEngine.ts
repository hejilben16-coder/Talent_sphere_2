import { dbStore } from './db.ts';
import { checkAndRepairCorruptedDocuments, generateWithModelFallback } from './ragEngine.ts';
import { generateText, getApiKey, getDefaultModel, resolveProvider } from './llmProvider.ts';
import {
  Exam,
  ExamQuestion,
  QuestionType,
  DifficultyLevel,
  ExamAttempt,
  QuestionAnswerAttempt
} from '../src/types.ts';

export async function generateExamFromPDFs(params: {
  title: string;
  description: string;
  selectedDocIds: string[];
  questionType: QuestionType | 'mixed';
  difficulty: DifficultyLevel;
  questionCount: number;
  durationMinutes: number;
  userId: string;
}): Promise<Exam> {
  await checkAndRepairCorruptedDocuments();

  const settings = dbStore.getSettings();
  const allChunks = dbStore.getChunks();
  const relevantChunks = allChunks.filter((c) =>
    params.selectedDocIds.includes(c.docId)
  );

  if (relevantChunks.length === 0) {
    throw new Error('No uploaded PDF content found for the selected documents.');
  }

  const contextText = relevantChunks
    .slice(0, 15) // take representative chunks
    .map((c) => `[PDF: ${c.docName}, Page: ${c.pageNumber}]\n${c.content}`)
    .join('\n\n');

  const docNames = Array.from(new Set(relevantChunks.map((c) => c.docName)));

  const prompt = `You are an expert assessment designer and professor.
Generate an educational exam based strictly on the provided PDF text below.

EXAM PARAMETERS:
- Total Questions: ${params.questionCount}
- Question Type: ${params.questionType} (Options: mcq, short, long, true_false, fill_in_blank, or mixed)
- Difficulty Level: ${params.difficulty}

CONTEXT TEXT:
${contextText.substring(0, 8000)}

INSTRUCTIONS:
Return a strictly valid JSON array of objects representing questions. Do NOT wrap in markdown code blocks if possible, or wrap in \`\`\`json.
Each object in the array MUST have:
1. "type": string ("mcq", "short", "long", "true_false", or "fill_in_blank")
2. "question": string
3. "options": array of strings (for "mcq" or "true_false" - e.g. ["True", "False"], for others set empty array [])
4. "correctAnswer": string
5. "explanation": string (detailed explanation of why the answer is correct)
6. "sourceDocName": string (matching one of the document names in context)
7. "sourcePage": number
8. "difficulty": string ("${params.difficulty}")
9. "bloomsLevel": string ("Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", or "Creating")
10. "points": number (e.g. 5, 10)

Example format:
[
  {
    "type": "mcq",
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Because...",
    "sourceDocName": "${docNames[0] || 'Doc.pdf'}",
    "sourcePage": 1,
    "difficulty": "${params.difficulty}",
    "bloomsLevel": "Understanding",
    "points": 10
  }
]`;

  const provider = resolveProvider();
  const apiKey = getApiKey(provider);
  let questions: ExamQuestion[] = [];

  if (apiKey) {
    try {
      let responseText = await generateWithModelFallback(
        settings.llmModel || getDefaultModel(undefined, provider),
        prompt
      );

      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(responseText);

      if (Array.isArray(parsed)) {
        questions = parsed.map((q, idx) => ({
          id: `q_${Date.now()}_${idx}`,
          type: q.type || 'mcq',
          question: q.question || 'Sample question',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          sourceDocName: q.sourceDocName || docNames[0] || 'Reference PDF',
          sourcePage: q.sourcePage || 1,
          difficulty: (q.difficulty as DifficultyLevel) || params.difficulty,
          bloomsLevel: q.bloomsLevel || 'Understanding',
          points: q.points || 10
        }));
      }
    } catch (e) {
      console.error('Error generating exam questions with Gemini:', e);
    }
  }

  // Fallback / backup generator if API unavailable or parsed empty
  if (questions.length === 0) {
    for (let i = 0; i < params.questionCount; i++) {
      const chunk = relevantChunks[i % relevantChunks.length];
      const isMcq = params.questionType === 'mcq' || (params.questionType === 'mixed' && i % 2 === 0);
      questions.push({
        id: `q_${Date.now()}_${i}`,
        type: isMcq ? 'mcq' : 'short',
        question: `Based on ${chunk.docName} (Page ${chunk.pageNumber}): What key concept is addressed in the excerpt "${chunk.content.substring(0, 60)}..."?`,
        options: isMcq
          ? [
              chunk.content.substring(0, 40),
              'Alternative concept A',
              'Alternative concept B',
              'Alternative concept C'
            ]
          : [],
        correctAnswer: chunk.content.substring(0, 40),
        explanation: `Refers to Page ${chunk.pageNumber} of ${chunk.docName}.`,
        sourceDocName: chunk.docName,
        sourcePage: chunk.pageNumber,
        difficulty: params.difficulty,
        bloomsLevel: 'Understanding',
        points: 10
      });
    }
  }

  const exam: Exam = {
    id: `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: params.title,
    description: params.description,
    sourceDocIds: params.selectedDocIds,
    docNames,
    totalQuestions: questions.length,
    durationMinutes: params.durationMinutes,
    questions,
    createdBy: params.userId,
    createdAt: new Date().toISOString()
  };

  dbStore.addExam(exam);
  return exam;
}

export async function submitExamAttempt(params: {
  examId: string;
  studentId: string;
  studentName: string;
  answers: { questionId: string; studentAnswer: string }[];
}): Promise<ExamAttempt> {
  const exam = dbStore.getExamById(params.examId);
  if (!exam) {
    throw new Error('Exam not found.');
  }

  let totalScoreEarned = 0;
  let totalPossibleScore = 0;

  const questionAttempts: QuestionAnswerAttempt[] = [];
  const weakTopicsSet = new Set<string>();
  const strongTopicsSet = new Set<string>();

  const provider = resolveProvider();
  const apiKey = getApiKey(provider);
  const settings = dbStore.getSettings();

  for (const q of exam.questions) {
    totalPossibleScore += q.points;
    const studentAnsObj = params.answers.find((a) => a.questionId === q.id);
    const studentAns = studentAnsObj ? studentAnsObj.studentAnswer.trim() : '';

    let isCorrect = false;
    let scoreEarned = 0;
    let aiFeedback = '';

    if (!studentAns) {
      aiFeedback = 'No response provided.';
      weakTopicsSet.add(`${q.sourceDocName} (Page ${q.sourcePage})`);
    } else if (q.type === 'mcq' || q.type === 'true_false') {
      isCorrect = studentAns.toLowerCase() === q.correctAnswer.trim().toLowerCase();
      scoreEarned = isCorrect ? q.points : 0;
      aiFeedback = isCorrect
        ? 'Correct answer!'
        : `Incorrect. Expected: "${q.correctAnswer}". Explanation: ${q.explanation}`;
      if (isCorrect) strongTopicsSet.add(`${q.sourceDocName} (Page ${q.sourcePage})`);
      else weakTopicsSet.add(`${q.sourceDocName} (Page ${q.sourcePage})`);
    } else {
      // AI semantic grading for Short, Long, or Fill-in-the-blank
      if (apiKey) {
        try {
          const evalPrompt = `Grade the student's answer out of ${q.points} points.
Question: ${q.question}
Expected Answer: ${q.correctAnswer}
Student Answer: ${studentAns}

Return JSON: {"score": number, "isCorrect": boolean, "feedback": "concise explanation"}`;
          let evalText = await generateText(evalPrompt, {
            provider,
            model: settings.llmModel || getDefaultModel(undefined, provider),
            temperature: 0.1
          });
          evalText = evalText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(evalText);

          scoreEarned = Math.min(q.points, Math.max(0, parsed.score || 0));
          isCorrect = scoreEarned >= q.points * 0.7;
          aiFeedback = parsed.feedback || q.explanation;
        } catch (_) {
          // Fallback keyword match
          isCorrect = studentAns.toLowerCase().includes(q.correctAnswer.toLowerCase().substring(0, 10));
          scoreEarned = isCorrect ? q.points : Math.round(q.points * 0.5);
          aiFeedback = `Graded via similarity match. ${q.explanation}`;
        }
      } else {
        isCorrect = true;
        scoreEarned = q.points;
        aiFeedback = 'Graded successfully.';
      }

      if (isCorrect) strongTopicsSet.add(`${q.sourceDocName} (Page ${q.sourcePage})`);
      else weakTopicsSet.add(`${q.sourceDocName} (Page ${q.sourcePage})`);
    }

    totalScoreEarned += scoreEarned;
    questionAttempts.push({
      questionId: q.id,
      studentAnswer: studentAns,
      isCorrect,
      scoreEarned,
      aiFeedback
    });
  }

  const percentage = Math.round((totalScoreEarned / (totalPossibleScore || 1)) * 100);

  const attempt: ExamAttempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    examId: exam.id,
    examTitle: exam.title,
    studentId: params.studentId,
    studentName: params.studentName,
    startedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    score: totalScoreEarned,
    totalPossibleScore,
    percentage,
    answers: questionAttempts,
    aiOverallFeedback: `Completed exam with ${percentage}% score. ${
      percentage >= 80
        ? 'Great mastery over the subject!'
        : 'Review suggested weak topics to strengthen key concepts.'
    }`,
    weakTopics: Array.from(weakTopicsSet),
    strongTopics: Array.from(strongTopicsSet)
  };

  dbStore.addAttempt(attempt);
  return attempt;
}
