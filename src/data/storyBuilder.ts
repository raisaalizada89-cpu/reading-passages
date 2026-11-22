import { CefrLevel, QuizQuestion, StoryWork, WordDefinition } from '../types/literature';

export const STORY_IMAGES = {
  lisbon: '/src/assets/images/story_lisbon_lanterns_1795275848189.jpg',
  train: '/src/assets/images/story_botanical_train_1795275848026.jpg',
  nightingale: '/src/assets/images/story_clockwork_nightingale_1795275848237.jpg',
  lighthouse: '/src/assets/images/story_lighthouse_letters_1795275848041.jpg',
  cartographer: '/src/assets/images/story_forgotten_cartographer_1795275847637.jpg',
  glass: '/src/assets/images/story_silent_glass_1795275848136.jpg',
  observatory: '/src/assets/images/story_mountain_observatory_1795277022569.jpg',
  bookshop: '/src/assets/images/story_rainy_bookshop_1795277023260.jpg',
  orchard: '/src/assets/images/story_sunlit_orchard_1795277023171.jpg',
  concert: '/src/assets/images/story_concert_hall_1795277023212.jpg',
  desert: '/src/assets/images/story_desert_caravan_1795277022707.jpg',
  clocktower: '/src/assets/images/story_winter_clocktower_1795277023242.jpg',
} as const;

export interface CompactVocabItem {
  word: string;
  lemma?: string;
  phonetic: string;
  partOfSpeech: string;
  cefrLevel?: string;
  definition: string;
  contextualMeaning: string;
  example: string;
  synonyms: string[];
  blankSentence: string;
}

export interface CompactStorySpec {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  level: CefrLevel;
  imageUrl: string;
  imageAlt: string;
  synopsis: string;
  paragraphs: string[];
  vocab: CompactVocabItem[];
}

const LEVEL_META: Record<
  CefrLevel,
  { levelLabel: string; accentColor: StoryWork['accentColor']; authorNote: string }
> = {
  B1: {
    levelLabel: 'B1 Intermediate',
    accentColor: 'emerald',
    authorNote: 'Original B1 Reading & Audio Edition',
  },
  B2: {
    levelLabel: 'B2 Upper-Intermediate',
    accentColor: 'sky',
    authorNote: 'Original B2 Literary Edition',
  },
  C1: {
    levelLabel: 'C1 Advanced',
    accentColor: 'amber',
    authorNote: 'Original C1 Essay & Fiction',
  },
  C2: {
    levelLabel: 'C2 Proficiency',
    accentColor: 'violet',
    authorNote: 'Original C2 Philosophical Prose',
  },
};

function findSentenceWithWord(paragraphs: string[], targetWord: string): string {
  const lower = targetWord.toLowerCase();
  for (const p of paragraphs) {
    const sentences = p.match(/[^.!?]+[.!?]+/g) ?? [p];
    const match = sentences.find((s) => s.toLowerCase().includes(lower));
    if (match) return match.trim();
  }
  return paragraphs[0];
}

export function buildStoryWork(spec: CompactStorySpec): StoryWork {
  const meta = LEVEL_META[spec.level];
  const fullText = spec.paragraphs.join(' ');
  const wordCount = fullText.trim().split(/\s+/).length;
  const readTimeMinutes = Math.max(3, Math.ceil(wordCount / 65));

  const glossary: Record<string, WordDefinition> = {};
  for (const v of spec.vocab) {
    const def: WordDefinition = {
      word: v.word,
      lemma: v.lemma || v.word.toLowerCase(),
      phonetic: v.phonetic,
      partOfSpeech: v.partOfSpeech,
      cefrLevel: v.cefrLevel || spec.level,
      definition: v.definition,
      contextualMeaning: v.contextualMeaning,
      example: v.example,
      synonyms: v.synonyms,
      source: 'curated',
    };
    glossary[v.word.toLowerCase()] = def;
    if (v.lemma && v.lemma.toLowerCase() !== v.word.toLowerCase()) {
      glossary[v.lemma.toLowerCase()] = def;
    }
  }

  const v0 = spec.vocab[0];
  const v1 = spec.vocab[1];
  const v2 = spec.vocab[2];
  const v3 = spec.vocab[3];

  const quiz: QuizQuestion[] = [];

  if (v0 && v1 && v2 && v3) {
    // 1. Context choice on v0
    const opts0 = [v0.definition, v1.definition, v2.definition, v3.definition];
    quiz.push({
      id: `${spec.id}-q1`,
      type: 'context-choice',
      targetWord: v0.word,
      prompt: `What does "${v0.word}" mean in this sentence from "${spec.title}"?`,
      passageExcerpt: findSentenceWithWord(spec.paragraphs, v0.word),
      options: opts0,
      correctIndex: 0,
      explanation: `"${v0.word}" (${v0.partOfSpeech}) means: ${v0.definition}`,
    });

    // 2. Fill in the blank on v1
    quiz.push({
      id: `${spec.id}-q2`,
      type: 'fill-blank',
      targetWord: v1.word,
      prompt: 'Choose the best word from the story to complete the sentence:',
      passageExcerpt: v1.blankSentence,
      options: [v2.word, v1.word, v0.word, v3.word],
      correctIndex: 1,
      explanation: `"${v1.word}" completes the sentence accurately: ${v1.definition}`,
    });

    // 3. Context choice on v2
    quiz.push({
      id: `${spec.id}-q3`,
      type: 'context-choice',
      targetWord: v2.word,
      prompt: `How is "${v2.word}" used in the following excerpt?`,
      passageExcerpt: findSentenceWithWord(spec.paragraphs, v2.word),
      options: [v0.definition, v3.definition, v2.definition, v1.definition],
      correctIndex: 2,
      explanation: `In this context, "${v2.word}" means: ${v2.definition}`,
    });

    // 4. Fill in the blank on v3
    quiz.push({
      id: `${spec.id}-q4`,
      type: 'fill-blank',
      targetWord: v3.word,
      prompt: 'Select the vocabulary word that fits this sentence:',
      passageExcerpt: v3.blankSentence,
      options: [v1.word, v0.word, v2.word, v3.word],
      correctIndex: 3,
      explanation: `"${v3.word}" (${v3.partOfSpeech}) means: ${v3.definition}`,
    });

    // 5. Interactive matching exercise across all 4 words
    quiz.push({
      id: `${spec.id}-q5`,
      type: 'matching',
      targetWord: 'matching-set',
      prompt: `Match each ${spec.level} word from "${spec.title}" with its English explanation.`,
      pairs: [
        { id: 'p1', word: v0.word, definition: v0.definition },
        { id: 'p2', word: v1.word, definition: v1.definition },
        { id: 'p3', word: v2.word, definition: v2.definition },
        { id: 'p4', word: v3.word, definition: v3.definition },
      ],
      explanation: `Reviewing these four ${spec.level} terms reinforces active reading and listening comprehension.`,
    });
  }

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    authorNote: meta.authorNote,
    level: spec.level,
    levelLabel: meta.levelLabel,
    genre: spec.genre,
    readTimeMinutes,
    wordCountEstimate: wordCount,
    imageUrl: spec.imageUrl,
    imageAlt: spec.imageAlt,
    accentColor: meta.accentColor,
    synopsis: spec.synopsis,
    paragraphs: spec.paragraphs,
    glossary,
    quiz,
  };
}
