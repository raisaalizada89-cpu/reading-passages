import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { speakSingleWord } from '../hooks/useSpeechReader';
import { QuizQuestion, StoryWork, WordDefinition } from '../types/literature';
import { buildTailoredQuiz } from '../utils/quizGenerator';
import { IllustratedFrame } from './IllustratedFrame';

interface VocabularyQuizViewProps {
  story: StoryWork;
  allStories: StoryWork[];
  encounteredWords: WordDefinition[];
  onSwitchStory: (storyId: string) => void;
  onBackToStory: () => void;
  onBackToLibrary: () => void;
  onQuizFinished: (storyId: string, storyTitle: string, score: number, total: number) => void;
  onSaveWordsBatch: (words: WordDefinition[], story: StoryWork) => void;
}

function shuffleDeterministic<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 100000;
  }
  for (let i = arr.length - 1; i > 0; i -= 1) {
    seed = (seed * 17 + 13) % 100000;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const VocabularyQuizView: React.FC<VocabularyQuizViewProps> = ({
  story,
  allStories,
  encounteredWords,
  onSwitchStory,
  onBackToStory,
  onBackToLibrary,
  onQuizFinished,
  onSaveWordsBatch,
}) => {
  const [attemptKey, setAttemptKey] = useState(0);
  const questions = useMemo(
    () => buildTailoredQuiz(story, encounteredWords),
    [story, encounteredWords, attemptKey]
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [savedBatchDone, setSavedBatchDone] = useState(false);

  // Matching exercise local state: map from pairId -> selected definition id
  const [activeLeftWordId, setActiveLeftWordId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});

  useEffect(() => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setMissedWords([]);
    setIsFinished(false);
    setSavedBatchDone(false);
    setActiveLeftWordId(null);
    setMatchedPairs({});
  }, [story.id, attemptKey]);

  const currentQuestion: QuizQuestion | undefined = questions[currentIdx];

  const shuffledRightDefs = useMemo(() => {
    if (!currentQuestion?.pairs) return [];
    return shuffleDeterministic(currentQuestion.pairs, currentQuestion.id + attemptKey);
  }, [currentQuestion, attemptKey]);

  if (!currentQuestion) {
    return null;
  }

  const handleSelectPairRight = (rightPairId: string) => {
    if (submitted || !activeLeftWordId) return;
    setMatchedPairs((prev) => {
      const updated = { ...prev };
      // Clear any previous left word that held this right definition
      for (const [leftId, rId] of Object.entries(updated)) {
        if (rId === rightPairId) {
          delete updated[leftId];
        }
      }
      updated[activeLeftWordId] = rightPairId;
      return updated;
    });
    setActiveLeftWordId(null);
  };

  const handleSubmitAnswer = () => {
    if (submitted) return;

    if (currentQuestion.type === 'matching' && currentQuestion.pairs) {
      const allCorrect = currentQuestion.pairs.every((p) => matchedPairs[p.id] === p.id);
      if (allCorrect) {
        setScore((s) => s + 1);
      } else {
        const wrongWords = currentQuestion.pairs
          .filter((p) => matchedPairs[p.id] !== p.id)
          .map((p) => p.word);
        setMissedWords((prev) => Array.from(new Set([...prev, ...wrongWords])));
      }
      setSubmitted(true);
      return;
    }

    if (selectedOption === null) return;
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
    } else if (currentQuestion.targetWord) {
      setMissedWords((prev) => Array.from(new Set([...prev, currentQuestion.targetWord])));
    }
    setSubmitted(true);
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((idx) => idx + 1);
      setSelectedOption(null);
      setSubmitted(false);
      setActiveLeftWordId(null);
      setMatchedPairs({});
    } else {
      setIsFinished(true);
      onQuizFinished(story.id, story.title, score, questions.length);
    }
  };

  const handleSaveStudyWords = () => {
    const targets = missedWords.length > 0 ? missedWords : Object.keys(story.glossary).slice(0, 4);
    const defs: WordDefinition[] = [];
    for (const w of targets) {
      const lower = w.toLowerCase();
      const found =
        story.glossary[lower] ||
        encounteredWords.find((e) => e.word.toLowerCase() === lower || e.lemma.toLowerCase() === lower);
      if (found) defs.push(found);
    }
    if (defs.length > 0) {
      onSaveWordsBatch(defs, story);
    }
    setSavedBatchDone(true);
  };

  const isMatchingReady =
    currentQuestion.type === 'matching' &&
    currentQuestion.pairs &&
    Object.keys(matchedPairs).length === currentQuestion.pairs.length;

  const canSubmit =
    currentQuestion.type === 'matching' ? Boolean(isMatchingReady) : selectedOption !== null;

  const isCurrentCorrect =
    currentQuestion.type === 'matching'
      ? Boolean(currentQuestion.pairs?.every((p) => matchedPairs[p.id] === p.id))
      : selectedOption === currentQuestion.correctIndex;

  const typeLabel =
    currentQuestion.type === 'context-choice'
      ? 'Multiple Choice · Context Meaning'
      : currentQuestion.type === 'fill-blank'
        ? 'Fill in the Blank'
        : 'Matching Exercise';

  const percentage = Math.round((score / questions.length) * 100);

  return (
    <main className="max-w-[980px] mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToStory}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Story</span>
          </button>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <button
            type="button"
            onClick={onBackToLibrary}
            className="text-sm font-medium text-slate-600 hover:text-slate-950 cursor-pointer"
          >
            Library
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="quiz-story-select" className="text-xs font-medium text-slate-500">
            Practice story:
          </label>
          <select
            id="quiz-story-select"
            value={story.id}
            onChange={(e) => onSwitchStory(e.target.value)}
            className="max-w-xs sm:max-w-sm text-xs sm:text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {(
              [
                { level: 'B1', label: 'B1 Intermediate' },
                { level: 'B2', label: 'B2 Upper-Intermediate' },
                { level: 'C1', label: 'C1 Advanced' },
                { level: 'C2', label: 'C2 Proficiency' },
              ] as const
            ).map((group) => {
              const items = allStories.filter((s) => s.level === group.level);
              if (items.length === 0) return null;
              return (
                <optgroup key={group.level} label={`${group.label} (${items.length})`}>
                  {items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>

      {/* Story Context Banner */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 shadow-sm">
        <div className="w-full sm:w-32 aspect-[4/3] rounded-xl overflow-hidden shrink-0">
          <IllustratedFrame
            src={story.imageUrl}
            alt={story.imageAlt}
            level={story.level}
            title={story.title}
          />
        </div>
        <div className="flex-1 space-y-1 text-center sm:text-left">
          <p className="text-xs font-semibold text-indigo-700">
            Vocabulary Studio · {story.levelLabel}
          </p>
          <h1 className="font-literary text-2xl font-bold text-slate-950">{story.title}</h1>
          <p className="text-sm text-slate-600">
            {encounteredWords.length > 0
              ? `Tailored using ${encounteredWords.length} word${encounteredWords.length === 1 ? '' : 's'} you explored plus core ${story.level} vocabulary.`
              : `Test your mastery of key ${story.level}+ vocabulary from this work across multiple-choice, fill-in-the-blank, and matching exercises.`}
          </p>
        </div>
      </section>

      {isFinished ? (
        /* Completion Scorecard */
        <section className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-7 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-700">Quiz Completed</p>
            <h2 className="font-literary text-3xl font-bold text-slate-950">
              You Scored <span className="font-mono-tabular text-indigo-700">{score}/{questions.length}</span> ({percentage}%)
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              {percentage >= 80
                ? 'Outstanding command of the vocabulary! You demonstrated strong comprehension of how these B1+ words function in context.'
                : 'Solid progress! Review any missed words in your Vocabulary Vault and revisit the story to strengthen recall.'}
            </p>
          </div>

          {missedWords.length > 0 && (
            <div className="max-w-xl mx-auto p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-left space-y-2">
              <p className="text-xs font-semibold text-amber-900">Words to Review</p>
              <p className="text-sm text-amber-950">{missedWords.join(', ')}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveStudyWords}
              disabled={savedBatchDone}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>
                {savedBatchDone
                  ? 'Added to Word Vault'
                  : missedWords.length > 0
                    ? 'Save Missed Words to Vault'
                    : 'Save Key Words to Vault'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAttemptKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Quiz</span>
            </button>

            <button
              type="button"
              onClick={onBackToLibrary}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors cursor-pointer"
            >
              <span>Explore Next Story</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : (
        /* Active Quiz Question Card */
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-9 shadow-sm space-y-6">
          {/* Progress header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-indigo-700">{typeLabel}</span>
              <span className="font-mono-tabular">
                Question {currentIdx + 1} of {questions.length} · Score {score}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${((currentIdx + (submitted ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <h2 className="font-literary text-xl sm:text-2xl font-bold text-slate-950 leading-snug">
            {currentQuestion.prompt}
          </h2>

          {currentQuestion.passageExcerpt && (
            <blockquote className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/80 font-literary text-base sm:text-lg text-slate-800 leading-relaxed">
              "{currentQuestion.passageExcerpt}"
            </blockquote>
          )}

          {/* Exercise Type 1 & 2: Multiple Choice / Fill in the Blank */}
          {(currentQuestion.type === 'context-choice' || currentQuestion.type === 'fill-blank') &&
            currentQuestion.options && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectOpt = idx === currentQuestion.correctIndex;

                  let stateStyle =
                    'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40';
                  if (submitted) {
                    if (isCorrectOpt) {
                      stateStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
                    } else if (isSelected && !isCorrectOpt) {
                      stateStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                    } else {
                      stateStyle = 'border-slate-200 bg-slate-50/60 text-slate-400';
                    }
                  } else if (isSelected) {
                    stateStyle = 'border-indigo-600 bg-indigo-50 text-indigo-950 font-medium ring-1 ring-indigo-600';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={submitted}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${stateStyle}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-mono-tabular text-xs font-semibold w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </span>
                      {submitted && isCorrectOpt && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {submitted && isSelected && !isCorrectOpt && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          {/* Exercise Type 3: Interactive Matching */}
          {currentQuestion.type === 'matching' && currentQuestion.pairs && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Select a word on the left, then click its matching English definition on the right.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column: Words */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-500">Story Words</p>
                  {currentQuestion.pairs.map((pair, idx) => {
                    const isActive = activeLeftWordId === pair.id;
                    const assignedRightId = matchedPairs[pair.id];
                    const isCorrectMatch = submitted && assignedRightId === pair.id;
                    const isWrongMatch = submitted && assignedRightId !== pair.id;

                    return (
                      <div key={pair.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={submitted}
                          onClick={() => setActiveLeftWordId(isActive ? null : pair.id)}
                          className={`flex-1 text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-between gap-2 cursor-pointer disabled:cursor-default ${
                            isCorrectMatch
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                              : isWrongMatch
                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                : isActive
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-600'
                                  : assignedRightId
                                    ? 'border-sky-300 bg-sky-50/70 text-sky-950'
                                    : 'border-slate-200 bg-white text-slate-900 hover:border-indigo-300'
                          }`}
                        >
                          <span>
                            <span className="font-mono-tabular text-xs text-slate-400 mr-2">{idx + 1}.</span>
                            {pair.word}
                          </span>
                          {assignedRightId && !submitted && (
                            <span className="text-xs font-medium text-sky-700">Linked</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => speakSingleWord(pair.word)}
                          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          aria-label={`Pronounce ${pair.word}`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Shuffled Definitions */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-500">English Definitions</p>
                  {shuffledRightDefs.map((rightPair) => {
                    const linkedLeftEntry = Object.entries(matchedPairs).find(
                      ([, rId]) => rId === rightPair.id
                    );
                    const linkedLeftWord = linkedLeftEntry
                      ? currentQuestion.pairs?.find((p) => p.id === linkedLeftEntry[0])?.word
                      : null;

                    const isMatchedCorrectly =
                      submitted && linkedLeftEntry && linkedLeftEntry[0] === rightPair.id;
                    const isMatchedWrongly =
                      submitted && (!linkedLeftEntry || linkedLeftEntry[0] !== rightPair.id);

                    return (
                      <button
                        key={rightPair.id}
                        type="button"
                        disabled={submitted}
                        onClick={() => handleSelectPairRight(rightPair.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors space-y-1 cursor-pointer disabled:cursor-default ${
                          isMatchedCorrectly
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                            : isMatchedWrongly
                              ? 'border-rose-300 bg-rose-50/60 text-rose-950'
                              : activeLeftWordId
                                ? 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-500 hover:bg-indigo-50 text-slate-800'
                                : linkedLeftWord
                                  ? 'border-sky-300 bg-sky-50/60 text-slate-900'
                                  : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <p className="leading-snug">{rightPair.definition}</p>
                        {linkedLeftWord && (
                          <p className="text-xs font-semibold text-sky-800">
                            Matched with: {linkedLeftWord}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Feedback Area after submitting */}
          {submitted && (
            <div
              className={`p-4 rounded-xl border space-y-1 ${
                isCurrentCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <p className="text-xs font-bold flex items-center gap-1.5">
                {isCurrentCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-700" />
                    <span>Not quite — review the explanation below</span>
                  </>
                )}
              </p>
              <p className="text-sm leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            {!submitted ? (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmitAnswer}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                Check Answer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <span>{currentIdx + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
};
