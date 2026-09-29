import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', description: 'Create a new task' },
    { key: '/', description: 'Focus search input instantly' },
    { key: 'Esc', description: 'Close any open modal or clear search' },
    { key: '1', description: 'Switch to All Tasks' },
    { key: '2', description: 'Switch to Today view' },
    { key: '3', description: 'Switch to Upcoming view' },
    { key: '4', description: 'Switch to Completed view' },
    { key: '?', description: 'Show this keyboard shortcuts guide' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-neutral-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs sm:text-sm">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <span className="text-neutral-600 dark:text-neutral-300">
                {sc.description}
              </span>
              <kbd className="rounded border border-neutral-300 bg-neutral-100 px-2 py-1 font-mono text-xs font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
