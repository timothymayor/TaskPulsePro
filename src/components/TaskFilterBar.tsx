import React from 'react';
import { Search, X, CheckSquare, Trash2, ArrowUpDown, Tag, AlertCircle } from 'lucide-react';
import { FilterView, Category, SortOption, Priority } from '../types/todo';

interface FilterBarProps {
  currentView: FilterView;
  onSelectView: (view: FilterView) => void;
  categoryFilter: Category | 'all';
  onSelectCategory: (cat: Category | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedCount: number;
  totalFilteredCount: number;
  onBulkComplete: () => void;
  onBulkIncomplete: () => void;
  onBulkDelete: () => void;
  onBulkCategory: (cat: Category) => void;
  onBulkPriority: (pri: Priority) => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

export const TaskFilterBar: React.FC<FilterBarProps> = ({
  currentView,
  onSelectView,
  categoryFilter,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedCount,
  totalFilteredCount,
  onBulkComplete,
  onBulkIncomplete,
  onBulkDelete,
  onBulkCategory,
  onBulkPriority,
  onClearSelection,
  onSelectAll,
}) => {
  const categories: { label: string; value: Category | 'all' }[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'Work', value: 'work' },
    { label: 'Personal', value: 'personal' },
    { label: 'Finance', value: 'finance' },
    { label: 'Health', value: 'health' },
    { label: 'Learning', value: 'learning' },
    { label: 'Errands', value: 'errands' },
  ];

  return (
    <div className="w-full space-y-3 pb-2">
      {/* Primary Toolbar: Search + Views + Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input with shortcut hint */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            id="task-search-input"
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search tasks, notes, or tags... (Press '/' to focus)"
            className="w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-9 py-2 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-100 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View segmented control */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
          {(['all', 'today', 'upcoming', 'urgent', 'completed'] as FilterView[]).map(view => {
            const isActive = currentView === view;
            const labels: Record<string, string> = {
              all: 'All',
              today: 'Today',
              upcoming: 'Upcoming',
              urgent: 'Urgent',
              completed: 'Done',
            };
            return (
              <button
                key={view}
                onClick={() => onSelectView(view)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {labels[view]}
              </button>
            );
          })}
        </div>

        {/* Category & Sorting controls */}
        <div className="flex items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => onSelectCategory(e.target.value as Category | 'all')}
              className="appearance-none rounded-lg border border-neutral-300 bg-white px-3 py-1.5 pr-8 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:focus:border-neutral-100 transition-colors"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <Tag className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => onSortChange(e.target.value as SortOption)}
              className="appearance-none rounded-lg border border-neutral-300 bg-white px-3 py-1.5 pr-8 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:focus:border-neutral-100 transition-colors"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Alphabetical</option>
              <option value="createdAt">Date Created</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when 1 or more items selected) */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-900 p-2.5 text-xs text-white dark:border-neutral-700 dark:bg-neutral-800 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3">
            <span className="font-medium font-mono">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onSelectAll}
              className="text-neutral-300 hover:text-white underline text-xs"
            >
              Select all ({totalFilteredCount})
            </button>
            <button
              onClick={onClearSelection}
              className="text-neutral-400 hover:text-white text-xs"
            >
              Deselect
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBulkComplete}
              className="flex items-center gap-1 rounded bg-neutral-800 px-2.5 py-1 text-xs hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors"
            >
              <CheckSquare className="h-3 w-3 text-emerald-400" />
              <span>Mark Done</span>
            </button>

            <button
              onClick={onBulkIncomplete}
              className="flex items-center gap-1 rounded bg-neutral-800 px-2.5 py-1 text-xs hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors"
            >
              <span>Mark Active</span>
            </button>

            {/* Quick Priority Batch Change */}
            <select
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  onBulkPriority(e.target.value as Priority);
                  e.target.value = '';
                }
              }}
              className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 dark:bg-neutral-700 focus:outline-hidden"
            >
              <option value="" disabled>Set Priority...</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Quick Category Batch Change */}
            <select
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  onBulkCategory(e.target.value as Category);
                  e.target.value = '';
                }
              }}
              className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 dark:bg-neutral-700 focus:outline-hidden"
            >
              <option value="" disabled>Set Category...</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="finance">Finance</option>
              <option value="health">Health</option>
              <option value="learning">Learning</option>
              <option value="errands">Errands</option>
            </select>

            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1 rounded bg-rose-900/80 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-800 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
