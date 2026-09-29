/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTodos } from './hooks/useTodos';
import { loadThemePreference, saveThemePreference } from './utils/storage';
import { TopBar } from './components/TopBar';
import { TaskStatsBar } from './components/TaskStatsBar';
import { TaskFilterBar } from './components/TaskFilterBar';
import { TaskCard } from './components/TaskCard';
import { TaskModal } from './components/TaskModal';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { DataManagementModal } from './components/DataManagementModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ProductivityDashboard } from './components/ProductivityDashboard';
import { EmptyState } from './components/EmptyState';
import { TodoItem } from './types/todo';
import { RotateCcw, ShieldCheck } from 'lucide-react';

export default function App() {
  const {
    todos,
    filteredTodos,
    stats,
    filterView,
    setFilterView,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedIds,
    toggleSelectTodo,
    selectAll,
    clearSelection,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    undoDelete,
    lastDeletedTodo,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    bulkDelete,
    bulkToggleComplete,
    bulkChangeCategory,
    bulkChangePriority,
    handleExport,
    handleImport,
    resetTodos,
  } = useTodos();

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveThemePreference(nextTheme);
  }, [theme]);

  // Synchronize theme on mount
  useEffect(() => {
    saveThemePreference(theme);
  }, [theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (isTaskModalOpen) setIsTaskModalOpen(false);
        if (isSecurityModalOpen) setIsSecurityModalOpen(false);
        if (isDataModalOpen) setIsDataModalOpen(false);
        if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
        if (searchQuery) setSearchQuery('');
        return;
      }

      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingTodo(null);
        setIsTaskModalOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('task-search-input') as HTMLInputElement | null;
        searchInput?.focus();
      } else if (e.key === '1') {
        setFilterView('all');
      } else if (e.key === '2') {
        setFilterView('today');
      } else if (e.key === '3') {
        setFilterView('upcoming');
      } else if (e.key === '4') {
        setFilterView('completed');
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTaskModalOpen, isSecurityModalOpen, isDataModalOpen, isShortcutsModalOpen, searchQuery, setFilterView, setSearchQuery]);

  // Handle Edit Action
  const handleStartEdit = (todo: TodoItem) => {
    setEditingTodo(todo);
    setIsTaskModalOpen(true);
  };

  const handleModalSubmit = (data: {
    title: string;
    description?: string;
    priority: TodoItem['priority'];
    category: TodoItem['category'];
    dueDate?: string;
    estimatedMinutes?: number;
    subtasks?: string[];
    tags?: string[];
  }) => {
    if (editingTodo) {
      updateTodo(editingTodo.id, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        dueDate: data.dueDate,
        estimatedMinutes: data.estimatedMinutes,
        tags: data.tags,
      });
    } else {
      addTodo(data);
    }
    setEditingTodo(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* 1. Header (Strict Top Bar Contract) */}
      <TopBar
        currentView={filterView}
        onSelectView={setFilterView}
        onOpenNewTaskModal={() => {
          setEditingTodo(null);
          setIsTaskModalOpen(true);
        }}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeCount={stats.active}
      />

      {/* 2. Compact Tabular Stats & Progress Ribbon */}
      <TaskStatsBar
        stats={stats}
        onFilterUrgent={() => setFilterView('urgent')}
        onFilterToday={() => setFilterView('today')}
        onFilterCompleted={() => setFilterView('completed')}
      />

      {/* 3. Main Content Viewport */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {filterView === 'stats' ? (
          <ProductivityDashboard todos={todos} />
        ) : (
          <div className="space-y-4">
            {/* Filter, Search & Batch Actions Toolbar */}
            <TaskFilterBar
              currentView={filterView}
              onSelectView={setFilterView}
              categoryFilter={categoryFilter}
              onSelectCategory={setCategoryFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              selectedCount={selectedIds.size}
              totalFilteredCount={filteredTodos.length}
              onBulkComplete={() => bulkToggleComplete(true)}
              onBulkIncomplete={() => bulkToggleComplete(false)}
              onBulkDelete={bulkDelete}
              onBulkCategory={bulkChangeCategory}
              onBulkPriority={bulkChangePriority}
              onClearSelection={clearSelection}
              onSelectAll={() => selectAll(filteredTodos.map(t => t.id))}
            />

            {/* Task Item List */}
            {filteredTodos.length === 0 ? (
              <EmptyState
                isSearchActive={Boolean(searchQuery.trim())}
                searchQuery={searchQuery}
                currentView={filterView}
                onClearSearch={() => setSearchQuery('')}
                onOpenCreate={() => {
                  setEditingTodo(null);
                  setIsTaskModalOpen(true);
                }}
                onResetFilters={() => {
                  setFilterView('all');
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
              />
            ) : (
              <div className="space-y-2.5">
                {filteredTodos.map(todo => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    isSelected={selectedIds.has(todo.id)}
                    onToggleSelect={toggleSelectTodo}
                    onToggleComplete={toggleTodo}
                    onEdit={handleStartEdit}
                    onDelete={deleteTodo}
                    onToggleSubtask={toggleSubtask}
                    onAddSubtask={addSubtask}
                    onDeleteSubtask={deleteSubtask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Transient Undo Banner for Deleted Items */}
      {lastDeletedTodo && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 animate-in fade-in slide-in-from-bottom-2">
          <span>Deleted &ldquo;{lastDeletedTodo.title.slice(0, 32)}...&rdquo;</span>
          <button
            onClick={undoDelete}
            className="flex items-center gap-1 rounded bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* 5. Quiet Clean Footer (Zero slop, no telemetry engines) */}
      <footer className="w-full border-t border-neutral-200/80 bg-white px-4 py-4 text-xs text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-950 dark:text-neutral-400 transition-colors">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">TaskPulse Pro</span>
            <span aria-hidden="true">·</span>
            <span>Enterprise To-Do & Workflow Manager</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>OWASP Level 1 Compliant</span>
            </button>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <button
              onClick={() => setIsShortcutsModalOpen(true)}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Shortcuts (?)
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTodo(null);
        }}
        onSubmit={handleModalSubmit}
        initialTodo={editingTodo}
      />

      <SecurityAuditModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        todos={todos}
        onExport={handleExport}
        onImport={handleImport}
        onReset={resetTodos}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
