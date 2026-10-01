import React from 'react';
import { Plus, ShieldCheck, Sun, Moon, Database, Keyboard } from 'lucide-react';
import { FilterView } from '../types/todo';

interface TopBarProps {
  currentView: FilterView;
  onSelectView: (view: FilterView) => void;
  onOpenNewTaskModal: () => void;
  onOpenSecurityModal: () => void;
  onOpenDataModal: () => void;
  onOpenShortcutsModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeCount: number;
  archivedCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onSelectView,
  onOpenNewTaskModal,
  onOpenSecurityModal,
  onOpenDataModal,
  onOpenShortcutsModal,
  theme,
  onToggleTheme,
  activeCount,
  archivedCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 shadow-xs">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
            TaskPulse
          </span>
          <span className="hidden sm:inline-flex items-center text-xs text-neutral-400 dark:text-neutral-500 font-mono">
            v2.4
          </span>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectView('all')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
              currentView === 'all'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            All Tasks
            {activeCount > 0 && (
              <span className="ml-1.5 text-xs font-mono opacity-70">
                ({activeCount})
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('today')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
              currentView === 'today'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Today
          </button>

          <button
            onClick={() => onSelectView('upcoming')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
              currentView === 'upcoming'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Upcoming
          </button>

          <button
            onClick={() => onSelectView('completed')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
              currentView === 'completed'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Completed
          </button>

          <button
            onClick={() => onSelectView('archived')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
              currentView === 'archived'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Archive
            {archivedCount > 0 && (
              <span className="ml-1.5 text-xs font-mono tabular-nums opacity-70">
                ({archivedCount})
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('stats')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
              currentView === 'stats'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Insights
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Security Compliance Inspector */}
          <button
            onClick={onOpenSecurityModal}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-neutral-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors"
            title="Open Security & Compliance Audit"
            aria-label="Security & Compliance Audit"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Security Verified</span>
          </button>

          {/* Backup / Data Management */}
          <button
            onClick={onOpenDataModal}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
            title="Data Backup & Restore"
            aria-label="Backup and Restore"
          >
            <Database className="h-4 w-4" />
          </button>

          {/* Keyboard Shortcuts */}
          <button
            onClick={onOpenShortcutsModal}
            className="hidden sm:flex rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Primary CTA */}
          <button
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200 transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
