import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

export type LLMProvider = 'gemini' | 'groq';

export function resolveProvider(): LLMProvider {
  const configured = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (configured === 'groq' || configured === 'gemini') {
    return configured;
  }

  if (process.env.GROQ_API_KEY) {
    return 'groq';
  }

  return 'gemini';
}

export function getDefaultModel(preferredModel?: string, provider: LLMProvider = resolveProvider()): string {
  if (provider === 'groq') {
    if (preferredModel && preferredModel.includes('gemini')) {
      return process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    }
    return preferredModel || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  }

  return preferredModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

export function getApiKey(provider: LLMProvider = resolveProvider()): string | null {
  if (provider === 'groq') {
    return process.env.GROQ_API_KEY || null;
  }

  return process.env.GEMINI_API_KEY || null;
}

export async function generateText(
  prompt: string,
  options: { provider?: LLMProvider; model?: string; temperature?: number } = {}
): Promise<string> {
  const provider = options.provider ?? resolveProvider();
  const model = getDefaultModel(options.model, provider);
  const temperature = options.temperature ?? 0.3;

  if (provider === 'groq') {
    const apiKey = getApiKey(provider);
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured.');
    }

    const client = new Groq({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_completion_tokens: 2048
    });

    const content: any = completion.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter((part: any) => typeof part === 'object' && part !== null)
        .map((part: any) => (typeof part.text === 'string' ? part.text : ''))
        .join('');
    }

    return '';
  }

  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { temperature }
  });

  return response.text || '';
}
