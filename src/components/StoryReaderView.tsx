import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Headphones,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from 'lucide-react';
import { COMMON_LEXICON } from '../data/commonLexicon';
import { speakSingleWord, useSpeechReader } from '../hooks/useSpeechReader';
import { CefrLevel, StoryCompletion, StoryWork, WordDefinition } from '../types/literature';
import { IllustratedFrame } from './IllustratedFrame';

interface StoryReaderViewProps {
  story: StoryWork;
  autoPlayOnOpen: boolean;
  completion?: StoryCompletion;
  savedWordKeys: Set<string>;
  encounteredWords: WordDefinition[];
  onBackToLibrary: () => void;
  onWordInspected: (storyId: string, definition: WordDefinition) => void;
  onToggleSaveWord: (definition: WordDefinition, story: StoryWork) => void;
  onMarkStoryComplete: (storyId: string, mode: 'read' | 'listen') => void;
  onLaunchQuiz: () => void;
}

const LEVEL_STYLES: Record<
  CefrLevel,
  {
    bannerTint: string;
    accentText: string;
    wordUnderline: string;
    buttonAccent: string;
  }
> = {
  B1: {
    bannerTint: 'bg-emerald-50/70 border-emerald-200/80',
    accentText: 'text-emerald-700',
    wordUnderline: 'decoration-emerald-400/90 hover:bg-emerald-100/70',
    buttonAccent: 'bg-emerald-600 hover:bg-emerald-700',
  },
  B2: {
    bannerTint: 'bg-sky-50/70 border-sky-200/80',
    accentText: 'text-sky-700',
    wordUnderline: 'decoration-sky-400/90 hover:bg-sky-100/70',
    buttonAccent: 'bg-sky-600 hover:bg-sky-700',
  },
  C1: {
    bannerTint: 'bg-amber-50/70 border-amber-200/80',
    accentText: 'text-amber-700',
    wordUnderline: 'decoration-amber-400/90 hover:bg-amber-100/70',
    buttonAccent: 'bg-amber-600 hover:bg-amber-700',
  },
  C2: {
    bannerTint: 'bg-violet-50/70 border-violet-200/80',
    accentText: 'text-violet-700',
    wordUnderline: 'decoration-violet-400/90 hover:bg-violet-100/70',
    buttonAccent: 'bg-violet-700 hover:bg-violet-800',
  },
};

function cleanTokenToWord(token: string): string {
  return token.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, '');
}

export const StoryReaderView: React.FC<StoryReaderViewProps> = ({
  story,
  autoPlayOnOpen,
  completion,
  savedWordKeys,
  encounteredWords,
  onBackToLibrary,
  onWordInspected,
  onToggleSaveWord,
  onMarkStoryComplete,
  onLaunchQuiz,
}) => {
  const styles = LEVEL_STYLES[story.level];
  const [highlightGlossary, setHighlightGlossary] = useState(true);
  const [fontSize, setFontSize] = useState<'base' | 'lg' | 'xl'>('lg');

  const [selectedWordText, setSelectedWordText] = useState<string | null>(null);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const clientCacheRef = useRef<Map<string, WordDefinition>>(new Map());
  const activeSentenceRef = useRef<HTMLSpanElement | null>(null);

  const speech = useSpeechReader({
    paragraphs: story.paragraphs,
    storyId: story.id,
    onListenComplete: () => {
      onMarkStoryComplete(story.id, 'listen');
    },
  });

  useEffect(() => {
    if (autoPlayOnOpen && speech.isSupported) {
      const timer = setTimeout(() => {
        speech.play(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [autoPlayOnOpen, story.id]);

  // Smoothly keep the actively spoken sentence in view during playback
  useEffect(() => {
    if (speech.isPlaying && activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [speech.currentIndex, speech.isPlaying]);

  // Reset selected word when story changes
  useEffect(() => {
    setSelectedWordText(null);
    setDefinition(null);
    setDefError(null);
    setMobileSheetOpen(false);
  }, [story.id]);

  // Group sentences by paragraph for clean literary rendering
  const paragraphsWithSentences = useMemo(() => {
    const grouped: Array<typeof speech.sentences> = story.paragraphs.map(() => []);
    for (const seg of speech.sentences) {
      if (grouped[seg.paragraphIndex]) {
        grouped[seg.paragraphIndex].push(seg);
      }
    }
    return grouped;
  }, [speech.sentences, story.paragraphs]);

  const glossaryKeys = useMemo(() => new Set(Object.keys(story.glossary)), [story.glossary]);
  const featuredGlossaryList = useMemo(() => Object.values(story.glossary).slice(0, 8), [story.glossary]);

  const inspectWord = async (rawToken: string, contextSentence: string) => {
    const cleaned = cleanTokenToWord(rawToken);
    if (!cleaned) return;

    const lower = cleaned.toLowerCase();
    setSelectedWordText(cleaned);
    setDefError(null);
    setMobileSheetOpen(true);

    // 1. Check story's curated glossary (exact or simple singular/stem match)
    const curatedMatch =
      story.glossary[lower] ||
      Object.values(story.glossary).find(
        (g) => g.word.toLowerCase() === lower || g.lemma.toLowerCase() === lower
      );

    if (curatedMatch) {
      setDefinition(curatedMatch);
      setIsLoadingDef(false);
      onWordInspected(story.id, curatedMatch);
      return;
    }

    // 2. Check fast common English lexicon
    if (COMMON_LEXICON[lower]) {
      const lexDef = COMMON_LEXICON[lower];
      setDefinition(lexDef);
      setIsLoadingDef(false);
      onWordInspected(story.id, lexDef);
      return;
    }

    // 3. Check session cache
    const cacheKey = `${lower}::${contextSentence.slice(0, 60)}`;
    const cached = clientCacheRef.current.get(cacheKey);
    if (cached) {
      setDefinition(cached);
      setIsLoadingDef(false);
      onWordInspected(story.id, cached);
      return;
    }

    // 4. Fetch real English contextual explanation from /api/define
    setIsLoadingDef(true);
    setDefinition(null);
    try {
      const response = await fetch('/api/define', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleaned,
          contextSentence,
          level: story.level,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not look up this word.');
      }

      const resolved = payload as WordDefinition;
      clientCacheRef.current.set(cacheKey, resolved);
      setDefinition(resolved);
      onWordInspected(story.id, resolved);
    } catch (err) {
      setDefError(err instanceof Error ? err.message : 'Unable to load word explanation.');
    } finally {
      setIsLoadingDef(false);
    }
  };

  const fontSizeClass =
    fontSize === 'base'
      ? 'text-[16px] leading-[1.78]'
      : fontSize === 'lg'
        ? 'text-[18px] leading-[1.82]'
        : 'text-[20px] leading-[1.85]';

  const isSaved = definition ? savedWordKeys.has(definition.lemma.toLowerCase()) : false;
  const isCompleted = Boolean(completion?.readCompleted || completion?.listenedCompleted);

  const renderInspectorBody = () => {
    if (isLoadingDef) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-700" />
          <p className="text-sm font-medium text-slate-700">
            Looking up <span className="font-semibold text-slate-950">"{selectedWordText}"</span> in context...
          </p>
        </div>
      );
    }

    if (defError) {
      return (
        <div className="py-6 space-y-3">
          <p className="text-sm font-semibold text-rose-700">Definition Unavailable</p>
          <p className="text-sm text-slate-600">{defError}</p>
          <button
            type="button"
            onClick={() => selectedWordText && inspectWord(selectedWordText, '')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!definition) {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="font-literary text-lg font-bold text-slate-950">Interactive English Dictionary</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Click <strong>any word</strong> in the story to inspect its English definition, part of speech, phonetic guide, and audio pronunciation.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-500">Featured Vocabulary in This Work</p>
            <div className="flex flex-wrap gap-2">
              {featuredGlossaryList.map((item) => (
                <button
                  key={item.word}
                  type="button"
                  onClick={() => inspectWord(item.word, item.example)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer"
                >
                  {item.word}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h3 className="font-literary text-2xl font-bold text-slate-950">{definition.word}</h3>
              {definition.lemma.toLowerCase() !== definition.word.toLowerCase() && (
                <span className="text-xs text-slate-500">base: {definition.lemma}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-indigo-700">{definition.partOfSpeech}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-slate-700">{definition.phonetic}</span>
              <span aria-hidden="true">·</span>
              <span>Level {definition.cefrLevel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => speakSingleWord(definition.word, 0.9, speech.selectedVoiceURI)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label={`Listen to pronunciation of ${definition.word}`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Pronounce</span>
          </button>
        </div>

        <div className="space-y-3.5 pt-3 border-t border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">English Definition</p>
            <p className="text-sm text-slate-900 leading-relaxed font-medium">{definition.definition}</p>
          </div>

          {definition.contextualMeaning && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
              <p className="text-xs font-semibold text-amber-900 mb-1">Meaning in This Passage</p>
              <p className="text-sm text-amber-950/90 leading-relaxed">{definition.contextualMeaning}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Example Usage</p>
            <p className="text-sm italic text-slate-700 leading-relaxed">"{definition.example}"</p>
          </div>

          {definition.synonyms && definition.synonyms.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Similar Words</p>
              <p className="text-sm text-slate-700">{definition.synonyms.join(', ')}</p>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleSaveWord(definition, story)}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              isSaved
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-indigo-700 text-white hover:bg-indigo-800'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span>{isSaved ? 'Saved in Word Vault' : 'Save to Word Vault'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="max-w-[1320px] mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8">
      {/* Top Reader Breadcrumb & Preferences */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToLibrary}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setHighlightGlossary((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              highlightGlossary
                ? 'bg-white border-indigo-200 text-indigo-800'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{highlightGlossary ? 'Target Words Highlighted' : 'Highlight Off'}</span>
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
            {(['base', 'lg', 'xl'] as const).map((sz, idx) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontSize(sz)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  fontSize === sz ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-label={`Text size ${sz}`}
              >
                {idx === 0 ? 'A-' : idx === 1 ? 'A' : 'A+'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Story Illustrated Header */}
      <section className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch rounded-2xl border p-5 sm:p-7 ${styles.bannerTint}`}>
        <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto rounded-xl overflow-hidden bg-white shadow-sm">
          <IllustratedFrame
            src={story.imageUrl}
            alt={story.imageAlt}
            level={story.level}
            title={story.title}
          />
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-5 bg-white/85 backdrop-blur-sm rounded-xl p-6 sm:p-7 border border-white">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className={`font-semibold ${styles.accentText}`}>{story.levelLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{story.genre}</span>
              <span aria-hidden="true">·</span>
              <span>{story.readTimeMinutes} min read</span>
              <span aria-hidden="true">·</span>
              <span>{story.authorNote}</span>
            </div>

            <h1 className="font-literary text-2xl sm:text-4xl font-bold text-slate-950 leading-tight text-balance">
              {story.title}
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">{story.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={speech.togglePlay}
              disabled={!speech.isSupported}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${styles.buttonAccent}`}
            >
              {speech.isPlaying ? <Pause className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
              <span>{speech.isPlaying ? 'Pause Narration' : 'Listen to Story'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onMarkStoryComplete(story.id, 'read');
                onLaunchQuiz();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 text-indigo-700" />
              <span>Vocabulary Quiz</span>
            </button>
          </div>
        </div>
      </section>

      {/* Audio Player Bar */}
      <section
        aria-label="Audio Narration Controls"
        className="bg-white rounded-2xl border border-slate-200/90 px-4 sm:px-6 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={speech.prevSentence}
            disabled={speech.currentIndex === 0}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            aria-label="Previous sentence"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={speech.togglePlay}
            disabled={!speech.isSupported}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {speech.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{speech.isPlaying ? 'Pause' : 'Play Audio'}</span>
          </button>

          <button
            type="button"
            onClick={speech.nextSentence}
            disabled={speech.currentIndex >= speech.totalSentences - 1}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            aria-label="Next sentence"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <span className="ml-2 text-xs font-mono-tabular text-slate-600">
            Sentence {speech.currentIndex + 1} / {speech.totalSentences}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            {[0.85, 1.0, 1.2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => speech.changeRate(spd)}
                className={`px-2.5 py-1 rounded-md font-mono-tabular transition-colors cursor-pointer ${
                  speech.rate === spd ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Voice selector */}
          {speech.voices.length > 0 && (
            <select
              aria-label="Select narrator voice"
              value={speech.selectedVoiceURI}
              onChange={(e) => speech.changeVoice(e.target.value)}
              className="max-w-[190px] truncate text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {speech.voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Main Two-Column Reading Stage + Interactive Word Inspector */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Prose Canvas */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-sm space-y-7">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs text-slate-500">
            <span>Tip: Click any word for an English explanation, or click the audio icon to jump narration.</span>
            <span className="font-mono-tabular shrink-0 ml-2">
              {encounteredWords.length} explored
            </span>
          </div>

          <article className={`font-literary text-slate-800 space-y-6 ${fontSizeClass}`}>
            {paragraphsWithSentences.map((sentenceList, pIdx) => (
              <p key={pIdx} className="leading-[inherit]">
                {sentenceList.map((segment) => {
                  const isCurrentSentence =
                    (speech.isPlaying || speech.currentIndex > 0) &&
                    segment.globalIndex === speech.currentIndex;

                  // Tokenize preserving spaces and punctuation
                  const tokens = segment.text.split(/(\s+)/);

                  return (
                    <span
                      key={segment.globalIndex}
                      ref={isCurrentSentence ? activeSentenceRef : undefined}
                      className={`inline transition-colors rounded-md ${
                        isCurrentSentence ? 'bg-amber-100/75 px-1 -mx-1 py-0.5' : ''
                      }`}
                    >
                      {tokens.map((tok, tIdx) => {
                        if (/^\s+$/.test(tok)) {
                          return <React.Fragment key={tIdx}>{tok}</React.Fragment>;
                        }

                        const clean = cleanTokenToWord(tok);
                        if (!clean) {
                          return <React.Fragment key={tIdx}>{tok}</React.Fragment>;
                        }

                        // Split leading/trailing punctuation so only letters highlight cleanly
                        const match = tok.match(/^([^a-zA-Z]*)([a-zA-Z'-]+)([^a-zA-Z]*)$/);
                        const prefix = match?.[1] ?? '';
                        const core = match?.[2] ?? tok;
                        const suffix = match?.[3] ?? '';

                        const lowerCore = core.toLowerCase();
                        const isTargetGlossary = glossaryKeys.has(lowerCore);
                        const isSelected =
                          selectedWordText && selectedWordText.toLowerCase() === lowerCore;

                        return (
                          <React.Fragment key={tIdx}>
                            {prefix}
                            <button
                              type="button"
                              onClick={() => inspectWord(core, segment.text)}
                              className={`inline font-inherit text-inherit p-0 m-0 border-0 bg-transparent rounded px-0.5 -mx-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white font-semibold'
                                  : isTargetGlossary && highlightGlossary
                                    ? `underline decoration-2 underline-offset-4 ${styles.wordUnderline}`
                                    : 'hover:bg-amber-100/80 hover:text-slate-950'
                              }`}
                            >
                              {core}
                            </button>
                            {suffix}
                          </React.Fragment>
                        );
                      })}{' '}
                    </span>
                  );
                })}
              </p>
            ))}
          </article>

          {/* End-of-Story Assessment CTA Card */}
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-sky-50/70 to-emerald-50/70 border border-indigo-100 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {speech.finishedAudio
                      ? 'Audio narration complete!'
                      : isCompleted
                        ? 'Story completed · Ready to review'
                        : 'Finished reading or listening?'}
                  </span>
                </div>
                <h2 className="font-literary text-xl sm:text-2xl font-bold text-slate-950">
                  Check Your Vocabulary from "{story.title}"
                </h2>
                <p className="text-sm text-slate-600 max-w-xl">
                  Take an interactive B1+ quiz with multiple-choice, fill-in-the-blank, and matching exercises tailored to the words in this story.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onMarkStoryComplete(story.id, 'read');
                  onLaunchQuiz();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Start Vocabulary Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sticky Desktop Word Inspector */}
        <aside
          aria-label="Word Definition Inspector"
          className="hidden lg:block lg:col-span-4 sticky top-24 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm"
        >
          {renderInspectorBody()}
        </aside>
      </section>

      {/* Mobile Word Definition Pop-up Drawer */}
      {mobileSheetOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex items-end bg-slate-950/40 backdrop-blur-[2px]"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl p-6 shadow-xl border-t border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500">Word Explanation</span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close definition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderInspectorBody()}
          </div>
        </div>
      )}
    </main>
  );
};
