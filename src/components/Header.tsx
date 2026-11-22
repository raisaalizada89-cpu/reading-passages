import React from 'react';

export type AppView = 'library' | 'reader' | 'quiz' | 'vault' | 'progress';

interface HeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onContinueReading: () => void;
  hasActiveStory: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  onContinueReading,
  hasActiveStory,
}) => {
  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'library', label: 'Library' },
    { id: 'vault', label: 'Word Vault' },
    { id: 'quiz', label: 'Quiz Studio' },
    { id: 'progress', label: 'Progress' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-slate-200/80">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="font-literary text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
        >
          Verba &amp; Verse
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  isActive
                    ? 'border-indigo-700 text-slate-950 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-950 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onContinueReading}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            {hasActiveStory ? 'Open Reader' : 'Start Reading'}
          </button>
        </div>
      </div>

      {/* Compact mobile nav row if screen < md */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center justify-around border-t border-slate-200/70 px-2 py-1.5 bg-white/90 text-xs font-medium"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-800 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
