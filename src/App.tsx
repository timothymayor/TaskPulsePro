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
import { RotateCcw, ShieldCheck, Lock, X, Repeat } from 'lucide-react';

export default function App() {
  const {
    todos,
    filteredTodos,
    stats,
    dailyGoal,
    setDailyGoal,
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
    archiveTodo,
    unarchiveTodo,
    archiveCompletedTodos,
    updateTodo,
    deleteTodo,
    undoDelete,
    lastDeletedTodo,
    lastRecreatedTodo,
    clearRecreatedNotification,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    bulkDelete,
    bulkToggleComplete,
    bulkArchive,
    bulkUnarchive,
    bulkChangeCategory,
    bulkChangePriority,
    reorderTodos,
    setTaskRank,
    moveTaskNudge,
    blockedNotification,
    clearBlockedNotification,
    handleExport,
    handleImport,
    resetTodos,
  } = useTodos();

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());

  const handleToggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const nextTheme = prevTheme === 'dark' ? 'light' : 'dark';
      saveThemePreference(nextTheme);
      return nextTheme;
    });
  }, []);

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
      } else if (e.key === '5') {
        setFilterView('archived');
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

  const handleNavigateToTask = (id: string) => {
    // If the target task is not in the current filter view, reset filters so it's visible
    const targetInCurrent = filteredTodos.some(t => t.id === id);
    if (!targetInCurrent) {
      const targetTodo = todos.find(t => t.id === id);
      setFilterView(targetTodo?.archived ? 'archived' : 'all');
      setCategoryFilter('all');
      setSearchQuery('');
    }
    // Scroll element into view with a smooth pulse
    setTimeout(() => {
      const el = document.getElementById(`task-card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-amber-500');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-500');
        }, 2500);
      }
    }, 100);
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
    tagColors?: TodoItem['tagColors'];
    order?: number;
    dependencyIds?: string[];
    frequency?: TodoItem['frequency'];
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
        tagColors: data.tagColors,
        order: data.order,
        dependencyIds: data.dependencyIds,
        frequency: data.frequency,
      });
    } else {
      addTodo(data);
    }
    setEditingTodo(null);
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTaskId !== id) {
      setDragOverTaskId(id);
    }
  };

  const handleDragLeave = () => {
    // Avoid clearing prematurely
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (sourceId && sourceId !== targetId) {
      reorderTodos(sourceId, targetId);
    }
    setDraggedTaskId(null);
    setDragOverTaskId(null);
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
        archivedCount={stats.archived}
      />

      {/* 2. Compact Tabular Stats & Progress Ribbon */}
      <TaskStatsBar
        stats={stats}
        dailyGoal={dailyGoal}
        onUpdateDailyGoal={setDailyGoal}
        onFilterUrgent={() => setFilterView('urgent')}
        onFilterToday={() => setFilterView('today')}
        onFilterCompleted={() => setFilterView('completed')}
        onFilterArchived={() => setFilterView('archived')}
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
              completedUnarchivedCount={stats.completedUnarchived}
              archivedCount={stats.archived}
              onArchiveCompleted={archiveCompletedTodos}
              onBulkComplete={() => bulkToggleComplete(true)}
              onBulkIncomplete={() => bulkToggleComplete(false)}
              onBulkArchive={bulkArchive}
              onBulkUnarchive={bulkUnarchive}
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
                {filteredTodos.map((todo, idx) => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    rankNumber={todo.order ?? (idx + 1)}
                    isSelected={selectedIds.has(todo.id)}
                    onToggleSelect={toggleSelectTodo}
                    onToggleComplete={toggleTodo}
                    onArchive={archiveTodo}
                    onUnarchive={unarchiveTodo}
                    onEdit={handleStartEdit}
                    onDelete={deleteTodo}
                    onToggleSubtask={toggleSubtask}
                    onAddSubtask={addSubtask}
                    onDeleteSubtask={deleteSubtask}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onMoveNudge={moveTaskNudge}
                    isDragOver={dragOverTaskId === todo.id}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < filteredTodos.length - 1}
                    allTodos={todos}
                    onNavigateToTask={handleNavigateToTask}
                    onFilterByTag={(tag) => setSearchQuery(tag)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Active Prerequisite Dependencies Lock Banner */}
      {blockedNotification && (
        <div className="fixed bottom-6 left-6 z-40 max-w-md rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xl dark:border-amber-700/60 dark:bg-neutral-900 dark:text-amber-200 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-neutral-900 dark:text-white">
                Task completion locked
              </p>
              <p className="text-neutral-600 dark:text-neutral-300">
                Cannot complete &ldquo;{blockedNotification.taskTitle}&rdquo; because prerequisite task(s) are still active:
              </p>
              <ul className="mt-1.5 space-y-1">
                {blockedNotification.activeDependencies.map(dep => (
                  <li key={dep.id} className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleNavigateToTask(dep.id)}
                      className="underline decoration-dotted hover:text-amber-700 dark:hover:text-amber-300 truncate text-left"
                    >
                      {dep.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={clearBlockedNotification}
              className="rounded p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Transient Undo Banner for Deleted Items */}
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

      {/* 5b. Recurring Task Recreated Notification Banner */}
      {lastRecreatedTodo && !lastDeletedTodo && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-3 text-xs text-indigo-950 shadow-lg dark:border-indigo-700/60 dark:bg-neutral-900 dark:text-indigo-200 animate-in fade-in slide-in-from-bottom-2">
          <Repeat className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Recreated <strong className="font-semibold">{lastRecreatedTodo.frequency}</strong> task &ldquo;{lastRecreatedTodo.title.slice(0, 28)}&rdquo;
            {lastRecreatedTodo.dueDate ? (
              <span className="font-mono tabular-nums"> · Due {lastRecreatedTodo.dueDate}</span>
            ) : null}
          </span>
          <button
            onClick={() => {
              handleNavigateToTask(lastRecreatedTodo.id);
              clearRecreatedNotification();
            }}
            className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            View
          </button>
          <button
            onClick={clearRecreatedNotification}
            className="rounded p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 6. Quiet Clean Footer (Zero slop, no telemetry engines) */}
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
        totalTasksCount={todos.length}
        availableTasks={todos}
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
