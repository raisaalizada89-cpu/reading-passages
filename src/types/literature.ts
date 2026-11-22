export type CefrLevel = 'B1' | 'B2' | 'C1' | 'C2';

export interface WordDefinition {
  word: string;
  lemma: string;
  phonetic: string;
  partOfSpeech: string;
  cefrLevel: string;
  definition: string;
  contextualMeaning: string;
  example: string;
  synonyms: string[];
  source?: 'curated' | 'lexicon' | 'gemini' | 'dictionary';
}

export type QuizQuestionType = 'context-choice' | 'fill-blank' | 'matching';

export interface MatchingPair {
  id: string;
  word: string;
  definition: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  targetWord: string;
  prompt: string;
  passageExcerpt?: string;
  options?: string[];
  correctIndex?: number;
  pairs?: MatchingPair[];
  explanation: string;
}

export interface StoryWork {
  id: string;
  title: string;
  subtitle: string;
  authorNote: string;
  level: CefrLevel;
  levelLabel: string;
  genre: string;
  readTimeMinutes: number;
  wordCountEstimate: number;
  imageUrl: string;
  imageAlt: string;
  accentColor: 'emerald' | 'sky' | 'amber' | 'violet';
  synopsis: string;
  paragraphs: string[];
  glossary: Record<string, WordDefinition>;
  quiz: QuizQuestion[];
}

export interface SavedWord extends WordDefinition {
  id: string;
  storyId?: string;
  storyTitle?: string;
  savedAt: number;
  mastered: boolean;
}

export interface QuizAttempt {
  id: string;
  storyId: string;
  storyTitle: string;
  score: number;
  total: number;
  percentage: number;
  completedAt: number;
}

export interface StoryCompletion {
  storyId: string;
  readCompleted: boolean;
  listenedCompleted: boolean;
  bestQuizScore: number;
  totalQuestions: number;
  lastInteractedAt: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: 'reading' | 'listening' | 'vocabulary' | 'quiz';
  target: number;
}
