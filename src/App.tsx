import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppView, Header } from './components/Header';
import { LibraryView } from './components/LibraryView';
import { ProgressView } from './components/ProgressView';
import { StoryReaderView } from './components/StoryReaderView';
import { VocabularyQuizView } from './components/VocabularyQuizView';
import { VocabularyVaultView } from './components/VocabularyVaultView';
import { ALL_STORIES as STORIES } from './data/allStories';
import { QuizAttempt, SavedWord, StoryCompletion, StoryWork, WordDefinition } from './types/literature';

const STORAGE_KEYS = {
  lastStoryId: 'vv_last_story_id',
  savedWords: 'vv_saved_words',
  completions: 'vv_completions',
  quizAttempts: 'vv_quiz_attempts',
  inspectedCount: 'vv_inspected_count',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('library');
  const [activeStoryId, setActiveStoryId] = useState<string>(() =>
    readStorage<string>(STORAGE_KEYS.lastStoryId, STORIES[0].id)
  );
  const [autoPlayOnOpen, setAutoPlayOnOpen] = useState(false);

  const [savedWords, setSavedWords] = useState<SavedWord[]>(() =>
    readStorage<SavedWord[]>(STORAGE_KEYS.savedWords, [])
  );
  const [completions, setCompletions] = useState<Record<string, StoryCompletion>>(() =>
    readStorage<Record<string, StoryCompletion>>(STORAGE_KEYS.completions, {})
  );
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>(() =>
    readStorage<QuizAttempt[]>(STORAGE_KEYS.quizAttempts, [])
  );
  const [totalWordsInspected, setTotalWordsInspected] = useState<number>(() =>
    readStorage<number>(STORAGE_KEYS.inspectedCount, 0)
  );

  // Track words clicked per story during this session so Quiz Studio adapts to them
  const [encounteredByStory, setEncounteredByStory] = useState<Record<string, WordDefinition[]>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.lastStoryId, JSON.stringify(activeStoryId));
    } catch {
      // Ignore storage quota errors
    }
  }, [activeStoryId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.savedWords, JSON.stringify(savedWords));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedWords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions));
    } catch {
      // Ignore storage quota errors
    }
  }, [completions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.quizAttempts, JSON.stringify(quizAttempts));
    } catch {
      // Ignore storage quota errors
    }
  }, [quizAttempts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.inspectedCount, JSON.stringify(totalWordsInspected));
    } catch {
      // Ignore storage quota errors
    }
  }, [totalWordsInspected]);

  const activeStory = useMemo(
    () => STORIES.find((s) => s.id === activeStoryId) ?? STORIES[0],
    [activeStoryId]
  );

  const savedWordKeys = useMemo(
    () => new Set(savedWords.map((w) => w.lemma.toLowerCase())),
    [savedWords]
  );

  const handleSelectStory = useCallback((storyId: string, autoPlay = false) => {
    setActiveStoryId(storyId);
    setAutoPlayOnOpen(autoPlay);
    setActiveView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleStartQuizForStory = useCallback((storyId: string) => {
    setActiveStoryId(storyId);
    setAutoPlayOnOpen(false);
    setActiveView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleWordInspected = useCallback((storyId: string, def: WordDefinition) => {
    setTotalWordsInspected((prev) => prev + 1);
    setEncounteredByStory((prev) => {
      const existing = prev[storyId] ?? [];
      if (existing.some((item) => item.lemma.toLowerCase() === def.lemma.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        [storyId]: [...existing, def],
      };
    });
  }, []);

  const handleToggleSaveWord = useCallback((def: WordDefinition, story: StoryWork) => {
    const key = def.lemma.toLowerCase();
    setSavedWords((prev) => {
      const exists = prev.some((item) => item.lemma.toLowerCase() === key);
      if (exists) {
        return prev.filter((item) => item.lemma.toLowerCase() !== key);
      }
      const newWord: SavedWord = {
        ...def,
        id: `${key}-${Date.now()}`,
        storyId: story.id,
        storyTitle: story.title,
        savedAt: Date.now(),
        mastered: false,
      };
      return [newWord, ...prev];
    });
  }, []);

  const handleSaveWordsBatch = useCallback((defs: WordDefinition[], story: StoryWork) => {
    setSavedWords((prev) => {
      const existingKeys = new Set(prev.map((w) => w.lemma.toLowerCase()));
      const additions: SavedWord[] = [];
      for (const def of defs) {
        const key = def.lemma.toLowerCase();
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          additions.push({
            ...def,
            id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            storyId: story.id,
            storyTitle: story.title,
            savedAt: Date.now(),
            mastered: false,
          });
        }
      }
      return [...additions, ...prev];
    });
  }, []);

  const handleToggleMastered = useCallback((wordId: string) => {
    setSavedWords((prev) =>
      prev.map((w) => (w.id === wordId ? { ...w, mastered: !w.mastered } : w))
    );
  }, []);

  const handleRemoveWord = useCallback((wordId: string) => {
    setSavedWords((prev) => prev.filter((w) => w.id !== wordId));
  }, []);

  const handleMarkStoryComplete = useCallback(
    (storyId: string, mode: 'read' | 'listen') => {
      setCompletions((prev) => {
        const current = prev[storyId] ?? {
          storyId,
          readCompleted: false,
          listenedCompleted: false,
          bestQuizScore: 0,
          totalQuestions: 0,
          lastInteractedAt: Date.now(),
        };
        return {
          ...prev,
          [storyId]: {
            ...current,
            readCompleted: current.readCompleted || mode === 'read',
            listenedCompleted: current.listenedCompleted || mode === 'listen',
            lastInteractedAt: Date.now(),
          },
        };
      });
    },
    []
  );

  const handleQuizFinished = useCallback(
    (storyId: string, storyTitle: string, score: number, total: number) => {
      const percentage = Math.round((score / total) * 100);
      setQuizAttempts((prev) => [
        {
          id: `quiz-${Date.now()}`,
          storyId,
          storyTitle,
          score,
          total,
          percentage,
          completedAt: Date.now(),
        },
        ...prev,
      ]);

      setCompletions((prev) => {
        const current = prev[storyId] ?? {
          storyId,
          readCompleted: true,
          listenedCompleted: false,
          bestQuizScore: 0,
          totalQuestions: total,
          lastInteractedAt: Date.now(),
        };
        const isBetter = score > current.bestQuizScore;
        return {
          ...prev,
          [storyId]: {
            ...current,
            readCompleted: true,
            bestQuizScore: isBetter ? score : current.bestQuizScore,
            totalQuestions: total,
            lastInteractedAt: Date.now(),
          },
        };
      });
    },
    []
  );

  const handleNavigate = useCallback((view: AppView) => {
    setAutoPlayOnOpen(false);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-900">
      <Header
        activeView={activeView}
        onNavigate={handleNavigate}
        onContinueReading={() => handleSelectStory(activeStory.id, false)}
        hasActiveStory={Boolean(activeStoryId)}
      />

      <div className="flex-1">
        {activeView === 'library' && (
          <LibraryView
            stories={STORIES}
            completions={completions}
            savedWordsCount={savedWords.length}
            lookedUpCount={totalWordsInspected}
            onSelectStory={handleSelectStory}
            onStartQuizForStory={handleStartQuizForStory}
            onOpenVault={() => handleNavigate('vault')}
          />
        )}

        {activeView === 'reader' && (
          <StoryReaderView
            story={activeStory}
            autoPlayOnOpen={autoPlayOnOpen}
            completion={completions[activeStory.id]}
            savedWordKeys={savedWordKeys}
            encounteredWords={encounteredByStory[activeStory.id] ?? []}
            onBackToLibrary={() => handleNavigate('library')}
            onWordInspected={handleWordInspected}
            onToggleSaveWord={handleToggleSaveWord}
            onMarkStoryComplete={handleMarkStoryComplete}
            onLaunchQuiz={() => handleStartQuizForStory(activeStory.id)}
          />
        )}

        {activeView === 'quiz' && (
          <VocabularyQuizView
            story={activeStory}
            allStories={STORIES}
            encounteredWords={encounteredByStory[activeStory.id] ?? []}
            onSwitchStory={(id) => setActiveStoryId(id)}
            onBackToStory={() => handleSelectStory(activeStory.id, false)}
            onBackToLibrary={() => handleNavigate('library')}
            onQuizFinished={handleQuizFinished}
            onSaveWordsBatch={handleSaveWordsBatch}
          />
        )}

        {activeView === 'vault' && (
          <VocabularyVaultView
            savedWords={savedWords}
            onToggleMastered={handleToggleMastered}
            onRemoveWord={handleRemoveWord}
            onExploreLibrary={() => handleNavigate('library')}
          />
        )}

        {activeView === 'progress' && (
          <ProgressView
            stories={STORIES}
            completions={completions}
            savedWords={savedWords}
            totalWordsInspected={totalWordsInspected}
            quizAttempts={quizAttempts}
            onOpenStory={(id) => handleSelectStory(id, false)}
            onLaunchQuiz={handleStartQuizForStory}
          />
        )}
      </div>

      <footer className="border-t border-slate-200/80 bg-white/70 mt-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p className="font-literary font-semibold text-slate-700">Verba &amp; Verse</p>
          <p>English Literature &amp; Vocabulary Studio · CEFR B1 to C2</p>
        </div>
      </footer>
    </div>
  );
}
