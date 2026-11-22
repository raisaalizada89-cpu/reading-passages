import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Layers, RotateCw, Trash2, Volume2 } from 'lucide-react';
import { speakSingleWord } from '../hooks/useSpeechReader';
import { SavedWord } from '../types/literature';

interface VocabularyVaultViewProps {
  savedWords: SavedWord[];
  onToggleMastered: (wordId: string) => void;
  onRemoveWord: (wordId: string) => void;
  onExploreLibrary: () => void;
}

export const VocabularyVaultView: React.FC<VocabularyVaultViewProps> = ({
  savedWords,
  onToggleMastered,
  onRemoveWord,
  onExploreLibrary,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'learning' | 'mastered'>('all');
  const [practiceMode, setPracticeMode] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const filtered = useMemo(() => {
    return savedWords.filter((w) => {
      if (filterStatus === 'learning') return !w.mastered;
      if (filterStatus === 'mastered') return w.mastered;
      return true;
    });
  }, [savedWords, filterStatus]);

  const masteredCount = savedWords.filter((w) => w.mastered).length;
  const activeCard = filtered[cardIndex] ?? filtered[0];

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-indigo-700">Personal Vocabulary Notebook</p>
          <h1 className="font-literary text-3xl sm:text-4xl font-bold text-slate-950">
            Word Vault
          </h1>
          <p className="text-sm text-slate-600">
            Review words you saved while reading, listen to their pronunciation, and practice with flashcards.
          </p>
        </div>

        {savedWords.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setPracticeMode((prev) => !prev);
              setCardIndex(0);
              setIsFlipped(false);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Layers className="w-4 h-4" />
            <span>{practiceMode ? 'View Word List' : 'Flashcard Practice'}</span>
          </button>
        )}
      </div>

      {savedWords.length === 0 ? (
        <section className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="font-literary text-2xl font-bold text-slate-950">Your Word Vault is Empty</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Open any story in the Library and click on words you want to learn. Tap "Save to Word Vault" in the definition inspector to build your personal study deck.
          </p>
          <button
            type="button"
            onClick={onExploreLibrary}
            className="mt-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors cursor-pointer"
          >
            Browse Stories
          </button>
        </section>
      ) : (
        <>
          {/* Filter & Summary Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl text-xs font-medium">
              {[
                { id: 'all', label: `All Words (${savedWords.length})` },
                { id: 'learning', label: `In Review (${savedWords.length - masteredCount})` },
                { id: 'mastered', label: `Mastered (${masteredCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterStatus(tab.id as 'all' | 'learning' | 'mastered');
                    setCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-mono-tabular ${
                    filterStatus === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-600">
              No words in this filter yet.
            </div>
          ) : practiceMode && activeCard ? (
            /* Flashcard Mode */
            <section className="max-w-xl mx-auto space-y-5">
              <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-500">
                <span>
                  Card {Math.min(cardIndex + 1, filtered.length)} of {filtered.length}
                </span>
                <span>{activeCard.mastered ? 'Mastered' : 'In Review'}</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 shadow-sm min-h-[290px] flex flex-col justify-between space-y-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-indigo-700">
                      {activeCard.partOfSpeech} · Level {activeCard.cefrLevel}
                    </p>
                    <h2 className="font-literary text-3xl font-bold text-slate-950 mt-1">
                      {activeCard.word}
                    </h2>
                    <p className="text-sm font-mono-tabular text-slate-500 mt-1">
                      {activeCard.phonetic}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakSingleWord(activeCard.word)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Listen</span>
                  </button>
                </div>

                {isFlipped ? (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <p className="text-base text-slate-900 font-medium leading-relaxed">
                      {activeCard.definition}
                    </p>
                    <p className="text-sm italic text-slate-600">"{activeCard.example}"</p>
                    {activeCard.synonyms.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Similar: {activeCard.synonyms.join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Reveal English Definition</span>
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleMastered(activeCard.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeCard.mastered
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-800 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{activeCard.mastered ? 'Mastered' : 'Mark as Mastered'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCardIndex((i) => (i - 1 + filtered.length) % filtered.length);
                        setIsFlipped(false);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCardIndex((i) => (i + 1) % filtered.length);
                        setIsFlipped(false);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Next Card
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            /* Word Grid */
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-literary text-xl font-bold text-slate-950">{item.word}</h3>
                        <p className="text-xs text-slate-500">
                          {item.partOfSpeech} · <span className="font-mono-tabular">{item.phonetic}</span> · {item.cefrLevel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakSingleWord(item.word)}
                        className="p-2 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer shrink-0"
                        aria-label={`Pronounce ${item.word}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed">{item.definition}</p>
                    <p className="text-xs italic text-slate-500">"{item.example}"</p>
                    {item.storyTitle && (
                      <p className="text-xs text-slate-400">From: {item.storyTitle}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleMastered(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        item.mastered
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{item.mastered ? 'Mastered' : 'Mark Mastered'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveWord(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.word}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
};
