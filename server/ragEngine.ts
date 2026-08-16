import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { dbStore } from './db.ts';
import { PDFDocument, DocumentChunk } from '../src/types.ts';
import { generateText, getApiKey, getDefaultModel, resolveProvider } from './llmProvider.ts';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const UPLOAD_DIR = path.join(process.cwd(), 'uploaded_pdfs');

if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (_) {}
}

function isCleanHumanReadableContent(text: string): boolean {
  if (!text || text.trim().length < 30) return false;

  // Check for raw PDF syntax tokens
  const pdfSyntaxKeywords = [
    '/Type',
    '/Catalog',
    '/Pages',
    '/MediaBox',
    '/Font',
    '/Contents',
    '/Parent',
    '/Resources',
    '/DeviceRGB',
    'endobj',
    'startxref',
    'xref',
    'trailer',
    '/FlateDecode',
    '/ProcSet',
    '/Subtype',
    '/PageLabels'
  ];

  let noiseCount = 0;
  for (const kw of pdfSyntaxKeywords) {
    if (text.includes(kw)) {
      noiseCount++;
    }
  }

  if (noiseCount >= 2) return false;

  const slashes = (text.match(/\//g) || []).length;
  const spaces = (text.match(/\s/g) || []).length;
  if (spaces > 0 && slashes / spaces > 0.12) {
    return false;
  }

  return true;
}

function filterPdfSyntaxNoise(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .split('\n')
    .filter((line) => {
      const l = line.trim();
      if (
        l.includes('/Type') ||
        l.includes('/MediaBox') ||
        l.includes('/Font') ||
        l.includes('/Contents') ||
        l.includes('/Parent') ||
        l.includes('/Resources') ||
        l.includes('/CS') ||
        l.includes('/DeviceRGB') ||
        l.startsWith('%PDF-') ||
        l.includes('endobj') ||
        l.includes('startxref') ||
        l.includes('xref') ||
        l.includes('trailer') ||
        l.includes('/FlateDecode') ||
        l.includes('/PageLabels') ||
        /^\d+\s+\d+\s+obj/.test(l)
      ) {
        return false;
      }
      return true;
    })
    .join('\n');
}

export async function generateWithModelFallback(
  preferredModel: string,
  contents: any,
  config?: any
): Promise<string> {
  const provider = resolveProvider();
  const candidateModels = Array.from(
    new Set([
      preferredModel,
      provider === 'groq' ? process.env.GROQ_MODEL || 'llama-3.1-8b-instant' : 'gemini-2.5-flash',
      provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash',
      provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gemini-1.5-flash',
      provider === 'groq' ? 'llama-3.1-8b-instant' : 'gemini-2.5-pro'
    ])
  );

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      if (provider === 'groq') {
        const apiKey = getApiKey(provider);
        if (!apiKey) {
          throw new Error('GROQ_API_KEY is not configured.');
        }

        const res = await generateText(contents, { provider, model, temperature: config?.temperature ?? 0.3 });
        if (res) {
          return res;
        }
      } else {
        const apiKey = getApiKey(provider);
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is not configured.');
        }

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model,
          contents,
          config
        });
        if (res && res.text) {
          return res.text;
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`${provider.toUpperCase()} model ${model} failed in fallback chain:`, err?.message || err);
      continue;
    }
  }

  throw lastError || new Error(`All ${provider} model calls failed in fallback chain.`);
}

export async function processUploadedPDF(
  fileBuffer: Buffer,
  fileName: string,
  userId: string,
  existingDocId?: string
): Promise<{ doc: PDFDocument; chunkCount: number }> {
  const settings = dbStore.getSettings();
  const provider = resolveProvider();
  const apiKey = getApiKey(provider);

  const docId = existingDocId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const filePath = path.join(UPLOAD_DIR, `${docId}.pdf`);
  if (!fs.existsSync(filePath) || existingDocId) {
    try {
      fs.writeFileSync(filePath, fileBuffer);
    } catch (e) {
      console.warn('Error writing uploaded PDF file to disk:', e);
    }
  }

  let text = '';
  let pageCount = 1;

  // Method 1: Fast local pdf-parse (Instant, 0 API quota used)
  try {
    const pdfData = await pdfParse(fileBuffer);
    const parsedText = pdfData.text || '';
    const cleaned = filterPdfSyntaxNoise(parsedText);
    if (isCleanHumanReadableContent(cleaned)) {
      text = cleaned;
      if (pdfData.numpages) pageCount = pdfData.numpages;
    }
  } catch (parseErr: any) {
    console.warn('pdf-parse parser warning:', parseErr?.message);
  }

  // Method 2: Clean prose regex extraction fallback
  if (!text || !isCleanHumanReadableContent(text)) {
    try {
      const rawString = fileBuffer.toString('latin1');
      const cleanBlocks = rawString.match(/[A-Za-z0-9.,;:!?'"()\-\s]{20,}/g);
      if (cleanBlocks && cleanBlocks.length > 0) {
        const filtered = filterPdfSyntaxNoise(cleanBlocks.join(' '));
        if (isCleanHumanReadableContent(filtered)) {
          text = filtered;
        }
      }
    } catch (_) {}
  }

  // Method 3: Gemini OCR for scanned or image-only PDFs (Uses model fallback chain)
  if ((!text || !isCleanHumanReadableContent(text)) && apiKey && fileBuffer.length > 50) {
    try {
      const ocrContents = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileBuffer.toString('base64')
          }
        },
        'You are an expert document OCR and transcription tool. Extract and transcribe ALL text, headings, section titles, tables, explanations, and bullet points from this PDF document page by page. Precede each page\'s content with "=== Page X ===" (e.g. === Page 1 ===). Provide clean, full, readable human text without any raw PDF source code or binary tags.'
      ];
      const ocrText = await generateWithModelFallback(settings.llmModel || getDefaultModel(undefined, provider), ocrContents);
      if (ocrText) {
        const cleaned = filterPdfSyntaxNoise(ocrText);
        if (isCleanHumanReadableContent(cleaned)) {
          text = cleaned;
        }
      }
    } catch (geminiErr: any) {
      console.warn('Gemini PDF OCR extraction warning:', geminiErr?.message);
    }
  }

  // Count pages based on page markers if present
  const pageMarkers = text.match(/===\s*Page\s*(\d+)\s*===/gi);
  if (pageMarkers && pageMarkers.length > 0) {
    pageCount = Math.max(pageCount, pageMarkers.length);
  }

  // Split text into chunks
  const chunkSize = settings.chunkSize || 800;
  const chunkOverlap = settings.chunkOverlap || 150;

  const chunks: DocumentChunk[] = [];

  if (text && text.trim().length > 20) {
    const pageSections = text.split(/===\s*Page\s*(\d+)\s*===/i);
    if (pageSections.length >= 3) {
      let currentPg = 1;
      for (let i = 1; i < pageSections.length; i += 2) {
        const pgNum = parseInt(pageSections[i], 10) || currentPg;
        currentPg = pgNum;
        const pageContent = (pageSections[i + 1] || '').trim();

        if (pageContent.length > 0) {
          let cIdx = 0;
          while (cIdx < pageContent.length) {
            const subChunk = pageContent.substring(cIdx, cIdx + chunkSize).trim();
            if (subChunk.length > 15) {
              chunks.push({
                id: `chk_${docId}_${chunks.length}`,
                docId,
                docName: fileName,
                pageNumber: pgNum,
                content: subChunk
              });
            }
            cIdx += chunkSize - chunkOverlap;
          }
        }
      }
    } else {
      const cleanText = text.replace(/\s+/g, ' ').trim();
      const totalLen = cleanText.length || 1;
      let charIndex = 0;

      while (charIndex < cleanText.length) {
        const chunkText = cleanText.substring(charIndex, charIndex + chunkSize).trim();
        if (chunkText.length > 15) {
          const approxPage = Math.min(
            pageCount,
            Math.max(1, Math.ceil((charIndex / totalLen) * pageCount))
          );
          chunks.push({
            id: `chk_${docId}_${chunks.length}`,
            docId,
            docName: fileName,
            pageNumber: approxPage,
            content: chunkText
          });
        }
        charIndex += chunkSize - chunkOverlap;
      }
    }
  }

  // Fallback chunk if text is minimal
  if (chunks.length === 0) {
    chunks.push({
      id: `chk_${docId}_0`,
      docId,
      docName: fileName,
      pageNumber: 1,
      content: `Document Title: ${fileName}. Content indexed for knowledge retrieval.`
    });
  }

  // Summary generation
  let summary = `Uploaded document "${fileName}" with ${pageCount} page(s) and ${chunks.length} extracted section(s).`;
  if (apiKey && text.length > 30) {
    try {
      const prompt = `Summarize the following document in 2 concise sentences:\n\n${text.substring(0, 3500)}`;
      const sumText = await generateWithModelFallback(settings.llmModel || getDefaultModel(undefined, provider), prompt);
      if (sumText) {
        summary = sumText.trim();
      }
    } catch (_) {}
  }

  const doc: PDFDocument = {
    id: docId,
    name: fileName,
    size: fileBuffer.length,
    uploadedAt: new Date().toISOString(),
    pageCount,
    chunkCount: chunks.length,
    uploadedBy: userId,
    summary,
    status: 'ready'
  };

  dbStore.addDocument(doc, chunks);

  return { doc, chunkCount: chunks.length };
}

export async function checkAndRepairCorruptedDocuments(): Promise<void> {
  const docs = dbStore.getDocuments();
  const chunks = dbStore.getChunks();

  for (const doc of docs) {
    const docChunks = chunks.filter((c) => c.docId === doc.id);
    const combinedSample = docChunks.map((c) => c.content).join('\n').substring(0, 2000);

    if (docChunks.length === 0 || !isCleanHumanReadableContent(combinedSample)) {
      const filePath = path.join(UPLOAD_DIR, `${doc.id}.pdf`);
      if (fs.existsSync(filePath)) {
        try {
          const fileBuf = fs.readFileSync(filePath);
          if (fileBuf.length > 50) {
            console.log(`Auto-repairing PDF index for document "${doc.name}" (${doc.id})...`);
            await processUploadedPDF(fileBuf, doc.name, doc.uploadedBy || 'usr_admin_1', doc.id);
          }
        } catch (err: any) {
          console.warn(`Failed to auto-repair document ${doc.name}:`, err?.message);
        }
      }
    }
  }
}

export function retrieveRelevantChunks(
  query: string,
  topK: number = 6,
  userRole: string = 'admin',
  studentUnlockedDay: number = 2
): {
  chunk: DocumentChunk;
  score: number;
}[] {
  let allChunks = dbStore.getChunks();
  if (allChunks.length === 0) return [];

  // Filter chunks for students based on 7-day study plan unlocked days
  if (userRole === 'student') {
    const unlockedDocKeywordsByDay: Record<number, string[]> = {
      1: ['machine learning', '101', 'ml101', 'foundations'],
      2: ['machine learning', '101', 'ml101', 'foundations', 'software engineering', 'rag handbook', 'rag202', 'handbook'],
      3: ['machine learning', '101', 'ml101', 'foundations', 'software engineering', 'rag handbook', 'rag202', 'handbook', 'vector', 'embeddings'],
      4: ['machine learning', '101', 'ml101', 'foundations', 'software engineering', 'rag handbook', 'rag202', 'handbook', 'vector', 'embeddings', 'enterprise rag', 'architecture'],
      5: ['machine learning', '101', 'ml101', 'foundations', 'software engineering', 'rag handbook', 'rag202', 'handbook', 'vector', 'embeddings', 'enterprise rag', 'architecture', 'prompt', 'fine-tuning'],
      6: ['machine learning', '101', 'ml101', 'foundations', 'software engineering', 'rag handbook', 'rag202', 'handbook', 'vector', 'embeddings', 'enterprise rag', 'architecture', 'prompt', 'fine-tuning', 'ethics', 'bias'],
      7: ['machine learning', '101', 'ml101', 'foundations', 'software engineering', 'rag handbook', 'rag202', 'handbook', 'vector', 'embeddings', 'enterprise rag', 'architecture', 'prompt', 'fine-tuning', 'ethics', 'bias', 'capstone']
    };

    const allowedKeywords = unlockedDocKeywordsByDay[Math.min(7, Math.max(1, studentUnlockedDay))] || unlockedDocKeywordsByDay[2];

    allChunks = allChunks.filter((chunk) => {
      const docNameLower = chunk.docName.toLowerCase();
      const docIdLower = chunk.docId.toLowerCase();
      return allowedKeywords.some((kw) => docNameLower.includes(kw) || docIdLower.includes(kw));
    });

    if (allChunks.length === 0) return [];
  }

  const rawQuery = query.toLowerCase().trim();

  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'can', 'could', 'may', 'might', 'must', 'and', 'but', 'or',
    'if', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
    'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'this',
    'that', 'these', 'those', 'it', 'its', 'pdf', 'document', 'file', 'tell',
    'me', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
    'how', 'give', 'show', 'explain', 'summarize', 'summary', 'overview',
    'please', 'help', 'know', 'can'
  ]);

  const allWords = rawQuery
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const keyTerms = allWords.filter((w) => !stopWords.has(w));
  const queryTerms = keyTerms.length > 0 ? keyTerms : allWords;

  const scored = allChunks.map((chunk) => {
    const contentLower = chunk.content.toLowerCase();
    const docNameLower = chunk.docName.toLowerCase();
    let score = 0;

    // Exact query string match
    if (rawQuery.length > 4 && contentLower.includes(rawQuery)) {
      score += 2.0;
    }

    if (queryTerms.length > 0) {
      let matches = 0;
      queryTerms.forEach((term) => {
        if (contentLower.includes(term)) {
          matches++;
        } else if (term.length > 4 && contentLower.includes(term.substring(0, term.length - 2))) {
          matches += 0.6;
        }

        // Boost score if term matches document name
        if (docNameLower.includes(term)) {
          score += 0.8;
        }
      });
      score += (matches / queryTerms.length) * 1.5;
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const positiveMatches = scored.filter((item) => item.score > 0);
  if (positiveMatches.length > 0) {
    return positiveMatches.slice(0, topK);
  }

  // Fallback: If no exact keyword matched or query is general (e.g. "summarize", "what is in this file"),
  // return top chunks from the uploaded documents so Gemini receives document context.
  return allChunks.slice(0, topK).map((chunk) => ({ chunk, score: 0.35 }));
}

export async function generateRAGAnswer(
  query: string,
  userId: string,
  userRole: string = 'admin',
  studentUnlockedDay: number = 2
): Promise<{ answer: string; sources: { docName: string; pageNumber: number; snippet: string; score: number }[] }> {
  const user = dbStore.getUserById(userId);
  const isAdmin = user?.role === 'admin';

  await checkAndRepairCorruptedDocuments();

  const settings = dbStore.getSettings();
  const topK = settings.topKRetrieval || 6;
  const allDocs = dbStore.getDocuments();

  if (allDocs.length === 0) {
    const noDocAnswer =
      'No PDF documents were found in your Knowledge Base. Please contact your instructor to assign study plan materials.';
    return { answer: noDocAnswer, sources: [] };
  }

  const retrieved = retrieveRelevantChunks(query, topK, userRole, studentUnlockedDay);

  if (retrieved.length === 0 && userRole === 'student') {
    return {
      answer: `🔒 **Study Plan Material Locked**\n\nYour question references materials that belong to locked modules in your 7-Day Study Plan. You are currently on **Day ${studentUnlockedDay}**.\n\nPlease complete your active day modules to unlock subsequent PDF materials and ask questions about them!`,
      sources: []
    };
  }

  const sources = retrieved.map((item) => ({
    docName: item.chunk.docName,
    pageNumber: item.chunk.pageNumber,
    snippet: item.chunk.content.length > 180 ? item.chunk.content.substring(0, 180) + '...' : item.chunk.content,
    score: Math.round(item.score * 100) / 100
  }));

  const contextText = retrieved
    .map(
      (r, i) =>
        `[Document: ${r.chunk.docName} | Page: ${r.chunk.pageNumber}]\n${r.chunk.content}`
    )
    .join('\n\n---\n\n');

  const assistantMode = isAdmin ? 'admin' : 'student';
  const guardrailMessage = 'I couldn\'t find that information in the uploaded learning materials.';
  const promptText = `You are Talent Sphere AI, an expert educational and document assistant.
You have direct access to the user's uploaded PDF knowledge base.
CRITICAL INSTRUCTIONS:
1. Answer the user's query directly, accurately, and thoroughly using content from the document context below.
2. If the user asks to summarize, explain, analyze, or list details from the document, synthesize the key information directly from the context.
3. Citing sources: Always cite the document title and page number when referencing specific details (e.g., "[Document: Title.pdf, Page 1]").
4. If the information is not present in the provided documents, respond with the exact phrase: ${guardrailMessage}
5. ${assistantMode === 'admin' ? 'You may help with admin tasks like explaining documents, generating exam ideas, summarizing PDFs, and analyzing document coverage.' : 'You are a student tutor. Focus only on learning content from the uploaded PDFs. Never reveal user lists, admin data, analytics for other students, or any non-document information.'}

DOCUMENT CONTEXT:
${contextText}

USER QUERY:
${query}`;

  const provider = resolveProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    return {
      answer: `[API Key Missing] Extracted relevant information from document **${retrieved[0].chunk.docName}** (Page ${retrieved[0].chunk.pageNumber}):\n\n> ${retrieved[0].chunk.content}\n\n*Please set ${provider === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'} in environment settings to enable AI synthesis.*`,
      sources
    };
  }

  try {
    const answer = await generateWithModelFallback(
      settings.llmModel || getDefaultModel(undefined, provider),
      promptText,
      { temperature: settings.temperature || 0.3 }
    );

    return { answer, sources };
  } catch (error: any) {
    console.error('Gemini RAG synthesis error:', error?.message || error);
    const topSnippet = retrieved[0]?.chunk?.content || 'No direct excerpt available.';
    const topDoc = retrieved[0]?.chunk?.docName || 'PDF Document';
    const topPage = retrieved[0]?.chunk?.pageNumber || 1;

    const fallbackAnswer = `### Extracted Information from Knowledge Base\n\n*Below is the exact relevant excerpt extracted from your uploaded document **${topDoc}** (Page ${topPage}):*\n\n---\n\n${topSnippet}\n\n---\n\n*Citation: [Document: ${topDoc}, Page ${topPage}]*`;

    return {
      answer: fallbackAnswer,
      sources
    };
  }
}

