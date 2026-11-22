import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Headphones, Search, Sparkles } from 'lucide-react';
import { CefrLevel, StoryCompletion, StoryWork } from '../types/literature';
import { IllustratedFrame } from './IllustratedFrame';

interface LibraryViewProps {
  stories: StoryWork[];
  completions: Record<string, StoryCompletion>;
  savedWordsCount: number;
  lookedUpCount: number;
  onSelectStory: (storyId: string, autoPlay?: boolean) => void;
  onStartQuizForStory: (storyId: string) => void;
  onOpenVault: () => void;
}

const LEVEL_ACCENTS: Record<
  CefrLevel,
  {
    topBar: string;
    labelText: string;
    activeTab: string;
    subtleBg: string;
  }
> = {
  B1: {
    topBar: 'bg-emerald-500',
    labelText: 'text-emerald-700',
    activeTab: 'bg-emerald-600 text-white shadow-sm',
    subtleBg: 'bg-emerald-50/70',
  },
  B2: {
    topBar: 'bg-sky-500',
    labelText: 'text-sky-700',
    activeTab: 'bg-sky-600 text-white shadow-sm',
    subtleBg: 'bg-sky-50/70',
  },
  C1: {
    topBar: 'bg-amber-500',
    labelText: 'text-amber-700',
    activeTab: 'bg-amber-600 text-white shadow-sm',
    subtleBg: 'bg-amber-50/70',
  },
  C2: {
    topBar: 'bg-violet-600',
    labelText: 'text-violet-700',
    activeTab: 'bg-violet-700 text-white shadow-sm',
    subtleBg: 'bg-violet-50/70',
  },
};

const STORIES_PER_PAGE = 12;

export const LibraryView: React.FC<LibraryViewProps> = ({
  stories,
  completions,
  savedWordsCount,
  lookedUpCount,
  onSelectStory,
  onStartQuizForStory,
  onOpenVault,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | CefrLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const collectionRef = useRef<HTMLElement | null>(null);

  const featuredStory = stories[0];

  const levelCounts = useMemo(() => {
    const counts: Record<'ALL' | CefrLevel, number> = {
      ALL: stories.length,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    };
    for (const s of stories) {
      counts[s.level] += 1;
    }
    return counts;
  }, [stories]);

  const filteredStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stories.filter((story) => {
      const matchesLevel = selectedLevel === 'ALL' || story.level === selectedLevel;
      const matchesQuery =
        !q ||
        story.title.toLowerCase().includes(q) ||
        story.subtitle.toLowerCase().includes(q) ||
        story.genre.toLowerCase().includes(q) ||
        story.levelLabel.toLowerCase().includes(q);
      return matchesLevel && matchesQuery;
    });
  }, [stories, selectedLevel, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLevel, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStories.length / STORIES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedStories = useMemo(() => {
    const start = (safePage - 1) * STORIES_PER_PAGE;
    return filteredStories.slice(start, start + STORIES_PER_PAGE);
  }, [filteredStories, safePage]);

  const handlePageChange = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(clamped);
    collectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const completedCount = Object.values(completions).filter(
    (c) => c.readCompleted || c.listenedCompleted
  ).length;

  const filterTabs: Array<{ id: 'ALL' | CefrLevel; label: string }> = [
    { id: 'ALL', label: `All Levels (${levelCounts.ALL})` },
    { id: 'B1', label: `B1 Intermediate (${levelCounts.B1})` },
    { id: 'B2', label: `B2 Upper-Intermediate (${levelCounts.B2})` },
    { id: 'C1', label: `C1 Advanced (${levelCounts.C1})` },
    { id: 'C2', label: `C2 Proficiency (${levelCounts.C2})` },
  ];

  return (
    <main className="max-w-[1320px] mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12">
      {/* Hero Split Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-7 sm:p-10 shadow-sm">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-wide text-indigo-700">
              Illustrated English Anthology · CEFR B1 to C2
            </p>
            <h1 className="font-literary text-3xl sm:text-5xl font-bold text-slate-950 leading-[1.12] text-balance">
              Read, Listen, and Master Living English Literature
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Explore colorful illustrated stories and essays crafted for intermediate to proficient learners. Listen with expressive narration, click any word for an instant English explanation, and test your vocabulary after every chapter.
            </p>
          </div>

          <div className="pt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onSelectStory(featuredStory.id, false)}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <span>Read Featured Story</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenVault}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <BookOpen className="w-4 h-4 text-indigo-700" />
              <span>Word Vault ({savedWordsCount})</span>
            </button>
          </div>
        </div>

        {/* Featured Story Artwork Card */}
        <div className="lg:col-span-5">
          <button
            type="button"
            onClick={() => onSelectStory(featuredStory.id, false)}
            className="group relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 block"
          >
            <IllustratedFrame
              src={featuredStory.imageUrl}
              alt={featuredStory.imageAlt}
              level={featuredStory.level}
              title={featuredStory.title}
              className="transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-7 text-white">
              <p className="text-xs font-medium text-amber-200 mb-1.5">
                Featured Work · {featuredStory.levelLabel} · {featuredStory.readTimeMinutes} min
              </p>
              <h2 className="font-literary text-2xl font-bold leading-snug text-white">
                {featuredStory.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-200 line-clamp-2">
                {featuredStory.subtitle}
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Full-width 4-Column Summary Strip below Hero */}
      <section
        aria-label="Learning Overview"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6"
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Curated Collection</p>
          <p className="text-2xl font-bold text-slate-950 font-mono-tabular">{stories.length} Works</p>
          <p className="text-xs text-slate-600">B1 Intermediate through C2</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Stories Completed</p>
          <p className="text-2xl font-bold text-emerald-700 font-mono-tabular">
            {completedCount}/{stories.length}
          </p>
          <p className="text-xs text-slate-600">Read or listened aloud</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Words Explored</p>
          <p className="text-2xl font-bold text-sky-700 font-mono-tabular">{lookedUpCount}</p>
          <p className="text-xs text-slate-600">Click any word in text</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Saved Vocabulary</p>
          <p className="text-2xl font-bold text-violet-700 font-mono-tabular">{savedWordsCount}</p>
          <p className="text-xs text-slate-600">Ready for flashcard review</p>
        </div>
      </section>

      {/* Filter Controls & Search */}
      <section ref={collectionRef} className="space-y-6 scroll-mt-20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filter stories by CEFR English level"
            className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-slate-200/90 rounded-xl"
          >
            {filterTabs.map((tab) => {
              const isActive = selectedLevel === tab.id;
              const activeClass =
                tab.id === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : LEVEL_ACCENTS[tab.id].activeTab;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setSelectedLevel(tab.id)}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                    isActive ? activeClass : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories, genres, or themes..."
              aria-label="Search stories"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            />
          </div>
        </div>

        {/* Result range bar */}
        {filteredStories.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <p>
              Showing{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {(safePage - 1) * STORIES_PER_PAGE + 1}–
                {Math.min(safePage * STORIES_PER_PAGE, filteredStories.length)}
              </span>{' '}
              of{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {filteredStories.length}
              </span>{' '}
              {filteredStories.length === 1 ? 'work' : 'works'}
            </p>
            {totalPages > 1 && (
              <p className="font-mono-tabular text-slate-500">
                Page {safePage} of {totalPages}
              </p>
            )}
          </div>
        )}

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <p className="font-literary text-xl font-semibold text-slate-900">No stories match your filter</p>
            <p className="text-sm text-slate-600">Try clearing your search query or viewing all CEFR levels.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedLevel('ALL');
                setSearchQuery('');
              }}
              className="mt-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              Show All Stories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {paginatedStories.map((story) => {
              const accent = LEVEL_ACCENTS[story.level];
              const progress = completions[story.id];
              const isDone = Boolean(progress?.readCompleted || progress?.listenedCompleted);
              const quizDone = Boolean(progress && progress.totalQuestions > 0 && progress.bestQuizScore > 0);

              return (
                <article
                  key={story.id}
                  className="group flex flex-col bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Color-coded top bar */}
                  <div className={`h-1.5 w-full ${accent.topBar}`} />

                  {/* 4:3 Illustration */}
                  <button
                    type="button"
                    onClick={() => onSelectStory(story.id, false)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    aria-label={`Open ${story.title}`}
                  >
                    <IllustratedFrame
                      src={story.imageUrl}
                      alt={story.imageAlt}
                      level={story.level}
                      title={story.title}
                      className="transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>

                  {/* Card Body */}
                  <div className="flex-1 flex flex-col justify-between p-6 space-y-5">
                    <div className="space-y-2.5">
                      {/* Clean unboxed metadata row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className={`font-semibold ${accent.labelText}`}>{story.levelLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{story.genre}</span>
                        <span aria-hidden="true">·</span>
                        <span>{story.readTimeMinutes} min read</span>
                      </div>

                      <h3 className="font-literary text-xl font-bold text-slate-950 leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectStory(story.id, false)}
                          className="text-left hover:text-indigo-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
                        >
                          {story.title}
                        </button>
                      </h3>

                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {story.synopsis}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      {/* Status indicator with explicit icon + text */}
                      <div className="flex items-center justify-between text-xs">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        ) : (
                          <span className="text-slate-500">Click any word while reading</span>
                        )}

                        {quizDone && progress && (
                          <span className="font-mono-tabular font-medium text-slate-700">
                            Best Quiz: {Math.round((progress.bestQuizScore / progress.totalQuestions) * 100)}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectStory(story.id, false)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectStory(story.id, true)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          title="Listen aloud"
                        >
                          <Headphones className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Listen</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onStartQuizForStory(story.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          title="Take vocabulary quiz"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Quiz</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav
            aria-label="Anthology pagination"
            className="pt-4 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(safePage - 1)}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isActive = page === safePage;
                return (
                  <button
                    key={page}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handlePageChange(page)}
                    className={`w-9 h-9 text-xs sm:text-sm font-mono-tabular font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-700 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(safePage + 1)}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
};
