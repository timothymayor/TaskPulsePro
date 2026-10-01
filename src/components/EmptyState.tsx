import React from 'react';
import { CheckCircle, SearchX, Plus, Archive } from 'lucide-react';
import { FilterView } from '../types/todo';

interface EmptyStateProps {
  isSearchActive: boolean;
  searchQuery: string;
  currentView: FilterView;
  onClearSearch: () => void;
  onOpenCreate: () => void;
  onResetFilters: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isSearchActive,
  searchQuery,
  currentView,
  onClearSearch,
  onOpenCreate,
  onResetFilters,
}) => {
  if (isSearchActive) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-16 px-4 text-center dark:border-neutral-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
          <SearchX className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
          No matching tasks found
        </h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm">
          No items match your query &ldquo;{searchQuery}&rdquo;. Try adjusting keywords or clearing the search filter.
        </p>
        <button
          onClick={onClearSearch}
          className="mt-4 rounded-lg border border-neutral-300 px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
        >
          Clear search query
        </button>
      </div>
    );
  }

  if (currentView === 'archived') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-16 px-4 text-center dark:border-neutral-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
          <Archive className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
          Your archive is empty
        </h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm">
          Move completed tasks to the Archive to keep your active workspace uncluttered while preserving your historical completion records.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
        >
          Return to active queue
        </button>
      </div>
    );
  }

  if (currentView === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-16 px-4 text-center dark:border-neutral-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
          No completed tasks yet
        </h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm">
          Check off items in your queue as you finish them to track your daily progress.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
        >
          View all tasks
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-16 px-4 text-center dark:border-neutral-800">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
        <CheckCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
        Your queue is clean and clear
      </h3>
      <p className="mt-1 text-xs text-neutral-500 max-w-sm">
        No active tasks in this view. Capture a new item to keep your momentum going.
      </p>
      <button
        onClick={onOpenCreate}
        className="mt-4 flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create task</span>
      </button>
    </div>
  );
};
