import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Headphones, Sparkles, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/stories';
import { CefrLevel, QuizAttempt, SavedWord, StoryCompletion, StoryWork } from '../types/literature';

interface ProgressViewProps {
  stories: StoryWork[];
  completions: Record<string, StoryCompletion>;
  savedWords: SavedWord[];
  totalWordsInspected: number;
  quizAttempts: QuizAttempt[];
  onOpenStory: (storyId: string) => void;
  onLaunchQuiz: (storyId: string) => void;
}

const LEDGER_PAGE_SIZE = 10;

export const ProgressView: React.FC<ProgressViewProps> = ({
  stories,
  completions,
  savedWords,
  totalWordsInspected,
  quizAttempts,
  onOpenStory,
  onLaunchQuiz,
}) => {
  const [ledgerLevel, setLedgerLevel] = useState<'ALL' | CefrLevel>('ALL');
  const [completedOnly, setCompletedOnly] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);

  const filteredLedgerStories = useMemo(() => {
    return stories.filter((s) => {
      if (ledgerLevel !== 'ALL' && s.level !== ledgerLevel) return false;
      if (completedOnly) {
        const comp = completions[s.id];
        return Boolean(comp?.readCompleted || comp?.listenedCompleted);
      }
      return true;
    });
  }, [stories, ledgerLevel, completedOnly, completions]);

  useEffect(() => {
    setLedgerPage(1);
  }, [ledgerLevel, completedOnly]);

  const totalLedgerPages = Math.max(1, Math.ceil(filteredLedgerStories.length / LEDGER_PAGE_SIZE));
  const safeLedgerPage = Math.min(ledgerPage, totalLedgerPages);
  const pagedLedgerStories = useMemo(() => {
    const start = (safeLedgerPage - 1) * LEDGER_PAGE_SIZE;
    return filteredLedgerStories.slice(start, start + LEDGER_PAGE_SIZE);
  }, [filteredLedgerStories, safeLedgerPage]);

  const completedStories = stories.filter((s) => {
    const c = completions[s.id];
    return Boolean(c?.readCompleted || c?.listenedCompleted);
  });

  const listenedStoriesCount = stories.filter((s) => completions[s.id]?.listenedCompleted).length;
  const distinctLevelsCompleted = new Set(completedStories.map((s) => s.level)).size;
  const masteredWordsCount = savedWords.filter((w) => w.mastered).length;
  const highScoreQuizzes = quizAttempts.filter((a) => a.percentage >= 80).length;

  const averageQuizPct =
    quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length)
      : 0;

  const getAchievementProgress = (id: string): number => {
    switch (id) {
      case 'first-story':
        return completedStories.length;
      case 'curious-scholar':
        return totalWordsInspected;
      case 'vault-collector':
        return savedWords.length;
      case 'audio-listener':
        return listenedStoriesCount;
      case 'quiz-ace':
        return highScoreQuizzes;
      case 'cefr-explorer':
        return distinctLevelsCompleted;
      case 'flashcard-master':
        return masteredWordsCount;
      case 'anthology-laureate':
        return completedStories.length;
      default:
        return 0;
    }
  };

  const unlockedCount = ACHIEVEMENTS.filter(
    (ach) => getAchievementProgress(ach.id) >= ach.target
  ).length;

  return (
    <main className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-indigo-700">Learning Analytics &amp; Milestones</p>
        <h1 className="font-literary text-3xl sm:text-4xl font-bold text-slate-950">
          Progress &amp; Achievements
        </h1>
        <p className="text-sm text-slate-600">
          Track completed stories, words explored and mastered, quiz performance, and earned milestones.
        </p>
      </div>

      {/* Key Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500">Stories Completed</p>
          <p className="text-3xl font-bold text-emerald-700 font-mono-tabular">
            {completedStories.length}/{stories.length}
          </p>
          <p className="text-xs text-slate-600">{listenedStoriesCount} listened aloud</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500">Vocabulary Learned</p>
          <p className="text-3xl font-bold text-indigo-700 font-mono-tabular">{savedWords.length}</p>
          <p className="text-xs text-slate-600">
            {masteredWordsCount} mastered · {totalWordsInspected} inspected
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500">Average Quiz Score</p>
          <p className="text-3xl font-bold text-sky-700 font-mono-tabular">
            {quizAttempts.length > 0 ? `${averageQuizPct}%` : '—'}
          </p>
          <p className="text-xs text-slate-600">
            {quizAttempts.length} {quizAttempts.length === 1 ? 'quiz' : 'quizzes'} completed
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500">Achievements Unlocked</p>
          <p className="text-3xl font-bold text-amber-600 font-mono-tabular">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </p>
          <p className="text-xs text-slate-600">Keep reading to earn all</p>
        </div>
      </section>

      {/* Achievements Grid */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          <h2 className="font-literary text-2xl font-bold text-slate-950">Milestones &amp; Achievements</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACHIEVEMENTS.map((ach) => {
            const current = getAchievementProgress(ach.id);
            const pct = Math.min(100, Math.round((current / ach.target) * 100));
            const unlocked = current >= ach.target;

            return (
              <article
                key={ach.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-shadow ${
                  unlocked
                    ? 'bg-gradient-to-br from-amber-50/70 via-white to-emerald-50/60 border-amber-200 shadow-sm'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        unlocked ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        unlocked ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {unlocked ? 'Unlocked' : 'In Progress'}
                    </span>
                  </div>

                  <h3 className="font-literary text-lg font-bold text-slate-950">{ach.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{ach.description}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-600">
                    <span>Progress</span>
                    <span>
                      {Math.min(current, ach.target)}/{ach.target}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        unlocked ? 'bg-emerald-600' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Story Completion Ledger + Recent Quiz History */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-literary text-xl font-bold text-slate-950">Anthology Progress</h2>
              <p className="text-xs text-slate-500 font-mono-tabular">
                {filteredLedgerStories.length} {filteredLedgerStories.length === 1 ? 'work' : 'works'} shown
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => {
                const active = ledgerLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLedgerLevel(lvl)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl === 'ALL' ? 'All' : lvl}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCompletedOnly((v) => !v)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  completedOnly
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Completed Only
              </button>
            </div>
          </div>

          {pagedLedgerStories.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-sm text-slate-500">
              <p>No works match the current filter.</p>
              <button
                type="button"
                onClick={() => {
                  setLedgerLevel('ALL');
                  setCompletedOnly(false);
                }}
                className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pagedLedgerStories.map((story) => {
                const comp = completions[story.id];
                const isDone = Boolean(comp?.readCompleted || comp?.listenedCompleted);
                const bestPct =
                  comp && comp.totalQuestions > 0
                    ? Math.round((comp.bestQuizScore / comp.totalQuestions) * 100)
                    : null;

                return (
                  <div key={story.id} className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-indigo-700">{story.levelLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{story.genre}</span>
                      </div>
                      <p className="font-literary font-semibold text-slate-950">{story.title}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              isDone ? 'text-emerald-600' : 'text-slate-300'
                            }`}
                          />
                          {isDone ? 'Completed' : 'Not yet completed'}
                        </span>
                        {comp?.listenedCompleted && (
                          <span className="inline-flex items-center gap-1 text-sky-700">
                            <Headphones className="w-3.5 h-3.5" />
                            Listened aloud
                          </span>
                        )}
                        {bestPct !== null && (
                          <span className="font-mono-tabular font-medium text-slate-800">
                            Best Quiz: {bestPct}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenStory(story.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onLaunchQuiz(story.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Quiz</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalLedgerPages > 1 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                disabled={safeLedgerPage <= 1}
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="font-mono-tabular text-slate-600">
                Page {safeLedgerPage} of {totalLedgerPages}
              </span>
              <button
                type="button"
                disabled={safeLedgerPage >= totalLedgerPages}
                onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          <h2 className="font-literary text-xl font-bold text-slate-950">Recent Quiz Scores</h2>
          {quizAttempts.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-sm text-slate-500">
              <p>No quizzes completed yet.</p>
              <p className="text-xs">Finish reading or listening to a story to test your vocabulary.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quizAttempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{attempt.storyTitle}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <p
                      className={`text-sm font-bold ${
                        attempt.percentage >= 80 ? 'text-emerald-700' : 'text-indigo-700'
                      }`}
                    >
                      {attempt.percentage}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {attempt.score}/{attempt.total}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
