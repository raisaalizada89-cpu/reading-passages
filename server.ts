import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

interface WordDefinitionResponse {
  word: string;
  lemma: string;
  phonetic: string;
  partOfSpeech: string;
  cefrLevel: string;
  definition: string;
  contextualMeaning: string;
  example: string;
  synonyms: string[];
  source: 'gemini' | 'dictionary';
}

const definitionCache = new Map<string, WordDefinitionResponse>();

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getLookupCandidates(clean: string): string[] {
  const candidates = [clean];
  if (clean.endsWith('ies') && clean.length > 4) candidates.push(`${clean.slice(0, -3)}y`);
  if (clean.endsWith('es') && clean.length > 4) candidates.push(clean.slice(0, -2));
  if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 3) candidates.push(clean.slice(0, -1));
  if (clean.endsWith('ied') && clean.length > 4) candidates.push(`${clean.slice(0, -3)}y`);
  if (clean.endsWith('ed') && clean.length > 4) {
    candidates.push(clean.slice(0, -1), clean.slice(0, -2));
  }
  if (clean.endsWith('ing') && clean.length > 5) {
    candidates.push(clean.slice(0, -3), `${clean.slice(0, -3)}e`);
  }
  if (clean.endsWith('ly') && clean.length > 4) candidates.push(clean.slice(0, -2));
  return Array.from(new Set(candidates));
}

async function fetchFreeDictionaryFallback(word: string, contextSentence?: string): Promise<WordDefinitionResponse | null> {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!clean) return null;

  for (const candidate of getLookupCandidates(clean)) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(candidate)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;

      const payload = (await res.json()) as Array<{
        word?: string;
        phonetic?: string;
        phonetics?: Array<{ text?: string }>;
        meanings?: Array<{
          partOfSpeech?: string;
          definitions?: Array<{
            definition?: string;
            example?: string;
            synonyms?: string[];
          }>;
          synonyms?: string[];
        }>;
      }>;

      const entry = payload?.[0];
      const meaning = entry?.meanings?.[0];
      const defObj = meaning?.definitions?.[0];
      if (!entry || !meaning || !defObj?.definition) continue;

      const phonetic =
        entry.phonetic ||
        entry.phonetics?.find((p) => p.text)?.text ||
        `/${candidate}/`;

      const synonyms = Array.from(
        new Set([
          ...(defObj.synonyms ?? []),
          ...(meaning.synonyms ?? []),
        ])
      ).slice(0, 4);

      return {
        word: clean,
        lemma: entry.word || candidate,
        phonetic,
        partOfSpeech: meaning.partOfSpeech || 'word',
        cefrLevel: 'B1+',
        definition: defObj.definition,
        contextualMeaning: contextSentence
          ? `Used in this passage as a ${meaning.partOfSpeech || 'word'} to convey: "${defObj.definition}"`
          : defObj.definition,
        example: defObj.example || `The writer used "${clean}" carefully in the story.`,
        synonyms,
        source: 'dictionary',
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/define', async (req, res) => {
    try {
      const rawWord = typeof req.body?.word === 'string' ? req.body.word.trim() : '';
      const contextSentence =
        typeof req.body?.contextSentence === 'string' ? req.body.contextSentence.trim().slice(0, 500) : '';
      const storyLevel = typeof req.body?.level === 'string' ? req.body.level.trim() : 'B2';

      const cleanedWord = rawWord.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, '');
      if (!cleanedWord || cleanedWord.length > 48) {
        return res.status(400).json({ error: 'Please select a valid English word to define.' });
      }

      const cacheKey = `${cleanedWord.toLowerCase()}::${contextSentence.toLowerCase().slice(0, 120)}`;
      const cached = definitionCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const ai = createGeminiClient();
      if (ai) {
        try {
          const prompt = [
            `Explain the English word "${cleanedWord}" in clear, natural English for a ${storyLevel} (intermediate to advanced) English learner.`,
            contextSentence ? `Context sentence from the story: "${contextSentence}"` : '',
            'Provide the base dictionary form (lemma), IPA phonetic transcription, part of speech, estimated CEFR level (A1–C2), a concise English definition, a short note explaining its exact nuance in the context sentence, one fresh natural example sentence, and 2 to 4 English synonyms.',
          ]
            .filter(Boolean)
            .join('\n');

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Gemini word lookup timed out')), 5000);
          });

          const response = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: prompt,
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    lemma: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    partOfSpeech: { type: Type.STRING },
                    cefrLevel: { type: Type.STRING },
                    definition: { type: Type.STRING },
                    contextualMeaning: { type: Type.STRING },
                    example: { type: Type.STRING },
                    synonyms: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'word',
                    'lemma',
                    'phonetic',
                    'partOfSpeech',
                    'cefrLevel',
                    'definition',
                    'contextualMeaning',
                    'example',
                    'synonyms',
                  ],
                },
              },
            }),
            timeoutPromise,
          ]);

          const text = (response.text ?? '').trim();
          if (text) {
            const parsed = JSON.parse(text) as Omit<WordDefinitionResponse, 'source'>;
            const result: WordDefinitionResponse = {
              word: parsed.word || cleanedWord,
              lemma: parsed.lemma || cleanedWord.toLowerCase(),
              phonetic: parsed.phonetic || `/${cleanedWord.toLowerCase()}/`,
              partOfSpeech: parsed.partOfSpeech || 'word',
              cefrLevel: parsed.cefrLevel || storyLevel,
              definition: parsed.definition,
              contextualMeaning: parsed.contextualMeaning || parsed.definition,
              example: parsed.example,
              synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 4) : [],
              source: 'gemini',
            };
            definitionCache.set(cacheKey, result);
            return res.json(result);
          }
        } catch (geminiError) {
          console.warn('Gemini /api/define lookup failed, attempting dictionary API fallback:', geminiError);
        }
      }

      const dictResult = await fetchFreeDictionaryFallback(cleanedWord, contextSentence);
      if (dictResult) {
        definitionCache.set(cacheKey, dictResult);
        return res.json(dictResult);
      }

      return res.status(404).json({
        error: `Could not find a definition for "${cleanedWord}". Please try clicking the base form or another word.`,
      });
    } catch (error) {
      console.error('Error in /api/define:', error);
      return res.status(500).json({
        error: 'Unable to retrieve word explanation right now. Please try again.',
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Verba & Verse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
