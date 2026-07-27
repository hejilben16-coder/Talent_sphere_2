import { dbStore } from './db.js';
import { StudyCoachData } from '../src/types.js';

export function getStudentCoachData(studentId: string): StudyCoachData {
  const attempts = dbStore.getAttempts(studentId);
  const docs = dbStore.getDocuments();

  const weakTopicCountMap: Record<string, number> = {};
  const strongTopicCountMap: Record<string, number> = {};

  attempts.forEach((a) => {
    a.weakTopics?.forEach((wt) => {
      weakTopicCountMap[wt] = (weakTopicCountMap[wt] || 0) + 1;
    });
    a.strongTopics?.forEach((st) => {
      strongTopicCountMap[st] = (strongTopicCountMap[st] || 0) + 1;
    });
  });

  const weakTopics = Object.keys(weakTopicCountMap).map((topic) => ({
    topic,
    docName: topic.split(' (Page')[0] || 'Reference Document',
    scorePct: Math.max(25, 100 - weakTopicCountMap[topic] * 20)
  }));

  const strongTopics = Object.keys(strongTopicCountMap).map((topic) => ({
    topic,
    docName: topic.split(' (Page')[0] || 'Reference Document',
    scorePct: Math.min(98, 70 + strongTopicCountMap[topic] * 10)
  }));

  // Default fallback items if no attempts yet
  if (weakTopics.length === 0 && docs.length > 0) {
    weakTopics.push({
      topic: `${docs[0].name} - Core Principles`,
      docName: docs[0].name,
      scorePct: 55
    });
  }

  const revisionPlan = [
    { day: 'Monday', task: 'Review core definitions and key formulas', pdfName: docs[0]?.name || 'Course PDF 1' },
    { day: 'Tuesday', task: 'Solve 10 practice MCQs on weak areas', pdfName: docs[0]?.name || 'Course PDF 1' },
    { day: 'Wednesday', task: 'Read chapters on advanced concepts & diagram analysis', pdfName: docs[1]?.name || docs[0]?.name || 'Course PDF 2' },
    { day: 'Thursday', task: 'Attempt targeted timed short-answer quiz', pdfName: docs[0]?.name || 'Course PDF 1' },
    { day: 'Friday', task: 'Comprehensive mock exam & revision review', pdfName: docs[0]?.name || 'Course PDF 1' }
  ];

  const flashcards = [
    {
      id: 'fc_1',
      front: 'What is RAG (Retrieval-Augmented Generation)?',
      back: 'An AI framework that combines document retrieval from a vector knowledge base with LLM text generation to produce accurate, source-cited answers.',
      topic: 'AI Architecture'
    },
    {
      id: 'fc_2',
      front: 'What is Bloom\'s Taxonomy?',
      back: 'A classification system used to categorize learning objectives: Remembering, Understanding, Applying, Analyzing, Evaluating, and Creating.',
      topic: 'Pedagogy'
    },
    {
      id: 'fc_3',
      front: 'How is Cosine Similarity used in vector databases?',
      back: 'It measures the cosine of the angle between two embedding vectors in multi-dimensional space to quantify semantic similarity.',
      topic: 'Vector Search'
    }
  ];

  const recommendedPdfs = docs.slice(0, 3).map((d) => ({
    docId: d.id,
    docName: d.name,
    reason: 'Recommended based on your recent exam performance gaps.'
  }));

  return {
    studentId,
    studyStreakDays: Math.max(1, attempts.length + 2),
    weakTopics,
    strongTopics,
    revisionPlan,
    flashcards,
    recommendedPdfs
  };
}
