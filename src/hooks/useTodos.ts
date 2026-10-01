import { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { TodoItem, Priority, Category, TagColor, RecurrenceFrequency, FilterView, SortOption, Subtask } from '../types/todo';
import { loadTodosFromStorage, saveTodosToStorage, INITIAL_TODOS, exportBackupData, parseAndValidateBackup, loadDailyGoal, saveDailyGoal } from '../utils/storage';
import { sanitizeString, validateTodoItem, createRecurringTaskInstance } from '../utils/security';

function isTaskCompletedToday(t: TodoItem, todayStr: string): boolean {
  if (!t.completed) return false;
  if (t.completedAt) {
    if (t.completedAt.split('T')[0] === todayStr) return true;
    try {
      if (new Date(t.completedAt).toDateString() === new Date().toDateString()) return true;
    } catch {
      // ignore invalid date
    }
    return false;
  }
  return t.dueDate === todayStr;
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>(() => loadTodosFromStorage());
  const [dailyGoal, setDailyGoalState] = useState<number>(() => loadDailyGoal());
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastDeletedTodo, setLastDeletedTodo] = useState<TodoItem | null>(null);
  const [lastRecreatedTodo, setLastRecreatedTodo] = useState<TodoItem | null>(null);

  // Sync to localStorage whenever todos change
  useEffect(() => {
    saveTodosToStorage(todos);
  }, [todos]);

  // Clean up selected IDs if todos are removed
  useEffect(() => {
    const existingIds = new Set(todos.map(t => t.id));
    setSelectedIds(prev => {
      const next = new Set<string>();
      for (const id of prev) {
        if (existingIds.has(id)) {
          next.add(id);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [todos]);

  // Update daily goal target (1 - 50 tasks)
  const setDailyGoal = useCallback((goal: number) => {
    const safe = saveDailyGoal(goal);
    setDailyGoalState(safe);
  }, []);

  // Trigger celebration confetti
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#10b981', '#3b82f6', '#6366f1', '#f59e0b'],
      });
    } catch {
      // Ignore if canvas not supported
    }
  }, []);

  // Add todo with optional priority rank and recurrence frequency
  const addTodo = useCallback((data: {
    title: string;
    description?: string;
    priority?: Priority;
    category?: Category;
    dueDate?: string;
    estimatedMinutes?: number;
    subtasks?: string[];
    tags?: string[];
    tagColors?: Record<string, TagColor>;
    order?: number;
    dependencyIds?: string[];
    frequency?: RecurrenceFrequency;
  }): TodoItem | null => {
    const safeTitle = sanitizeString(data.title, 200);
    if (!safeTitle) return null;

    const now = new Date().toISOString();
    const newTodo: TodoItem = {
      id: `tp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: safeTitle,
      description: data.description ? sanitizeString(data.description, 1000) : undefined,
      completed: false,
      createdAt: now,
      updatedAt: now,
      dueDate: data.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.dueDate) ? data.dueDate : undefined,
      priority: data.priority || 'medium',
      category: data.category || 'work',
      subtasks: (data.subtasks || []).map((stTitle, idx) => ({
        id: `st-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: sanitizeString(stTitle, 150),
        completed: false,
      })).filter(st => st.title.length > 0),
      estimatedMinutes: data.estimatedMinutes,
      tags: (data.tags || []).map(t => sanitizeString(t, 30).toLowerCase()).filter(Boolean),
      tagColors: data.tagColors,
      order: data.order,
      dependencyIds: Array.isArray(data.dependencyIds) ? data.dependencyIds.filter(Boolean) : [],
      frequency: data.frequency && data.frequency !== 'none' ? data.frequency : undefined,
    };

    setTodos(prev => {
      const currentList = [...prev].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      const requestedRank = data.order !== undefined && data.order > 0 ? Math.round(data.order) : 1;
      
      const insertIndex = Math.max(0, Math.min(currentList.length, requestedRank - 1));
      currentList.splice(insertIndex, 0, newTodo);

      const reindexed = currentList.map((item, index) => ({
        ...item,
        order: index + 1,
      }));

      fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      }).catch(() => {});

      return reindexed;
    });

    return newTodo;
  }, []);

  // Visual Drag-and-Drop Reorder
  const reorderTodos = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setTodos(prev => {
      const currentList = [...prev].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      const sourceIndex = currentList.findIndex(t => t.id === sourceId);
      const targetIndex = currentList.findIndex(t => t.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const [movedItem] = currentList.splice(sourceIndex, 1);
      currentList.splice(targetIndex, 0, movedItem);

      const now = new Date().toISOString();
      const reindexed = currentList.map((item, idx) => ({
        ...item,
        order: idx + 1,
        updatedAt: item.id === sourceId ? now : item.updatedAt,
      }));

      fetch('/api/todos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reindexed.map(t => t.id) }),
      }).catch(() => {});

      return reindexed;
    });
  }, []);

  // Numerical rank adjustment (e.g. move to rank #1, #2, etc.)
  const setTaskRank = useCallback((id: string, newRank: number) => {
    setTodos(prev => {
      const currentList = [...prev].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      const currentIndex = currentList.findIndex(t => t.id === id);
      if (currentIndex === -1) return prev;

      const [movedItem] = currentList.splice(currentIndex, 1);
      const targetIndex = Math.max(0, Math.min(currentList.length, Math.round(newRank) - 1));
      currentList.splice(targetIndex, 0, movedItem);

      const now = new Date().toISOString();
      const reindexed = currentList.map((item, idx) => ({
        ...item,
        order: idx + 1,
        updatedAt: item.id === id ? now : item.updatedAt,
      }));

      fetch('/api/todos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reindexed.map(t => t.id) }),
      }).catch(() => {});

      return reindexed;
    });
  }, []);

  // Quick 1-step nudge up or down
  const moveTaskNudge = useCallback((id: string, direction: 'up' | 'down') => {
    setTodos(prev => {
      const currentList = [...prev].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      const currentIndex = currentList.findIndex(t => t.id === id);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentList.length) return prev;

      const [movedItem] = currentList.splice(currentIndex, 1);
      currentList.splice(targetIndex, 0, movedItem);

      const now = new Date().toISOString();
      const reindexed = currentList.map((item, idx) => ({
        ...item,
        order: idx + 1,
        updatedAt: item.id === id ? now : item.updatedAt,
      }));

      fetch('/api/todos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reindexed.map(t => t.id) }),
      }).catch(() => {});

      return reindexed;
    });
  }, []);

  // Notification for blocked task attempt
  const [blockedNotification, setBlockedNotification] = useState<{
    taskId: string;
    taskTitle: string;
    activeDependencies: { id: string; title: string }[];
  } | null>(null);

  const clearBlockedNotification = useCallback(() => {
    setBlockedNotification(null);
  }, []);

  // Helper to check if a task is blocked
  const getTaskDependencyStatus = useCallback((task: TodoItem) => {
    const depIds = task.dependencyIds || [];
    if (depIds.length === 0) {
      return { isBlocked: false, activeDependencies: [], completedDependencies: [] };
    }
    const todoMap = new Map(todos.map(t => [t.id, t]));
    const activeDependencies: TodoItem[] = [];
    const completedDependencies: TodoItem[] = [];

    for (const depId of depIds) {
      const dep = todoMap.get(depId);
      if (dep) {
        if (dep.completed) {
          completedDependencies.push(dep);
        } else {
          activeDependencies.push(dep);
        }
      }
    }

    return {
      isBlocked: activeDependencies.length > 0,
      activeDependencies,
      completedDependencies,
    };
  }, [todos]);

  // Toggle completed status with dependency validation
  const toggleTodo = useCallback((id: string): { success: boolean; blockedBy?: TodoItem[] } => {
    const target = todos.find(t => t.id === id);
    if (!target) return { success: false };

    const willBeCompleted = !target.completed;

    // Check if prerequisite dependencies are still active
    if (willBeCompleted && target.dependencyIds && target.dependencyIds.length > 0) {
      const todoMap = new Map(todos.map(t => [t.id, t]));
      const activeDeps: TodoItem[] = [];
      for (const depId of target.dependencyIds) {
        const dep = todoMap.get(depId);
        if (dep && !dep.completed) {
          activeDeps.push(dep);
        }
      }

      if (activeDeps.length > 0) {
        setBlockedNotification({
          taskId: target.id,
          taskTitle: target.title,
          activeDependencies: activeDeps.map(d => ({ id: d.id, title: d.title })),
        });
        return { success: false, blockedBy: activeDeps };
      }
    }

    // Clear blocked notification if previously set for this task
    setBlockedNotification(prev => (prev?.taskId === id ? null : prev));

    setTodos(prev => {
      const now = new Date().toISOString();
      let spawnedRecurring: TodoItem | null = null;

      let next = prev.map(t => {
        if (t.id === id) {
          const updatedItem: TodoItem = {
            ...t,
            completed: willBeCompleted,
            completedAt: willBeCompleted ? now : undefined,
            archived: willBeCompleted ? t.archived : false,
            archivedAt: willBeCompleted ? t.archivedAt : undefined,
            updatedAt: now,
          };

          if (willBeCompleted && updatedItem.frequency && updatedItem.frequency !== 'none') {
            const alreadySpawned = prev.some(existing => existing.recurrenceSourceId === t.id);
            if (!alreadySpawned) {
              spawnedRecurring = createRecurringTaskInstance(updatedItem);
            }
          }

          return updatedItem;
        }
        return t;
      });

      if (spawnedRecurring) {
        const created = spawnedRecurring as TodoItem;
        setLastRecreatedTodo(created);
        next = [created, ...next].map((item, idx) => ({
          ...item,
          order: idx + 1,
        }));
      }

      if (willBeCompleted) {
        const remainingActive = next.filter(t => !t.completed && !t.archived).length;
        const todayStr = new Date().toISOString().split('T')[0];
        const prevDoneToday = prev.filter(item => isTaskCompletedToday(item, todayStr)).length;
        const nextDoneToday = next.filter(item => isTaskCompletedToday(item, todayStr)).length;
        if (remainingActive === 0 || (prevDoneToday < dailyGoal && nextDoneToday >= dailyGoal)) {
          triggerCelebration();
        }
      }

      fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: willBeCompleted,
          archived: willBeCompleted ? undefined : false,
        }),
      }).catch(() => {});

      return next;
    });

    return { success: true };
  }, [todos, triggerCelebration]);

  // Archive a single completed task
  const archiveTodo = useCallback((id: string): boolean => {
    const target = todos.find(t => t.id === id);
    if (!target || !target.completed) return false;

    const now = new Date().toISOString();
    setTodos(prev => prev.map(t => {
      if (t.id === id && t.completed) {
        return {
          ...t,
          archived: true,
          archivedAt: t.archivedAt || now,
          updatedAt: now,
        };
      }
      return t;
    }));

    setSelectedIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    fetch(`/api/todos/${id}/archive`, {
      method: 'POST',
    }).catch(() => {});

    return true;
  }, [todos]);

  // Unarchive (restore) a single archived task back to the main list
  const unarchiveTodo = useCallback((id: string): void => {
    const now = new Date().toISOString();
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          archived: false,
          archivedAt: undefined,
          updatedAt: now,
        };
      }
      return t;
    }));

    setSelectedIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    fetch(`/api/todos/${id}/unarchive`, {
      method: 'POST',
    }).catch(() => {});
  }, []);

  // Move all completed, non-archived tasks to the Archive
  const archiveCompletedTodos = useCallback((): number => {
    const completedToArchive = todos.filter(t => t.completed && !t.archived);
    if (completedToArchive.length === 0) return 0;

    const now = new Date().toISOString();
    const archivedIdSet = new Set(completedToArchive.map(t => t.id));

    setTodos(prev => prev.map(t => {
      if (t.completed && !t.archived) {
        return {
          ...t,
          archived: true,
          archivedAt: now,
          updatedAt: now,
        };
      }
      return t;
    }));

    setSelectedIds(prev => {
      const next = new Set<string>();
      for (const id of prev) {
        if (!archivedIdSet.has(id)) next.add(id);
      }
      return next;
    });

    fetch('/api/todos/archive-completed', {
      method: 'POST',
    }).catch(() => {});

    return completedToArchive.length;
  }, [todos]);

  // Update todo fields and/or priority rank
  const updateTodo = useCallback((id: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>) => {
    setTodos(prev => {
      const now = new Date().toISOString();
      const currentList = [...prev].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      const targetIndex = currentList.findIndex(t => t.id === id);
      if (targetIndex === -1) return prev;

      const existing = currentList[targetIndex];
      const merged = {
        ...existing,
        ...updates,
        title: updates.title !== undefined ? sanitizeString(updates.title, 200) : existing.title,
        description: updates.description !== undefined ? sanitizeString(updates.description, 1000) : existing.description,
        updatedAt: now,
      };
      const validated = validateTodoItem(merged) || existing;

      if (updates.order !== undefined && updates.order !== existing.order) {
        currentList.splice(targetIndex, 1);
        const newTargetIndex = Math.max(0, Math.min(currentList.length, Math.round(updates.order) - 1));
        currentList.splice(newTargetIndex, 0, validated);
      } else {
        currentList[targetIndex] = validated;
      }

      const reindexed = currentList.map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));

      fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      }).catch(() => {});

      return reindexed;
    });
  }, []);

  // Delete single todo with undo buffer and clean up dependency references
  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => {
      const toDelete = prev.find(t => t.id === id);
      if (toDelete) {
        setLastDeletedTodo(toDelete);
      }
      return prev
        .filter(t => t.id !== id)
        .map(t => {
          if (t.dependencyIds && t.dependencyIds.includes(id)) {
            return {
              ...t,
              dependencyIds: t.dependencyIds.filter(depId => depId !== id),
            };
          }
          return t;
        });
    });

    fetch(`/api/todos/${id}`, { method: 'DELETE' }).catch(() => {});
  }, []);

  // Undo delete
  const undoDelete = useCallback(() => {
    if (!lastDeletedTodo) return;
    setTodos(prev => [lastDeletedTodo, ...prev]);
    setLastDeletedTodo(null);
  }, [lastDeletedTodo]);

  // Subtask management
  const toggleSubtask = useCallback((todoId: string, subtaskId: string) => {
    setTodos(prev => {
      const now = new Date().toISOString();
      let spawnedRecurring: TodoItem | null = null;

      let next = prev.map(t => {
        if (t.id !== todoId) return t;
        const updatedSubtasks = t.subtasks.map(st => {
          if (st.id === subtaskId) {
            return { ...st, completed: !st.completed };
          }
          return st;
        });
        // Check if all subtasks completed
        const allSubtasksDone = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
        const becomingCompleted = allSubtasksDone && !t.completed;
        const updatedItem: TodoItem = {
          ...t,
          subtasks: updatedSubtasks,
          completed: allSubtasksDone ? true : t.completed,
          completedAt: becomingCompleted ? now : t.completedAt,
          updatedAt: now,
        };

        if (becomingCompleted && updatedItem.frequency && updatedItem.frequency !== 'none') {
          const alreadySpawned = prev.some(existing => existing.recurrenceSourceId === t.id);
          if (!alreadySpawned) {
            spawnedRecurring = createRecurringTaskInstance(updatedItem);
          }
        }

        return updatedItem;
      });

      if (spawnedRecurring) {
        const created = spawnedRecurring as TodoItem;
        setLastRecreatedTodo(created);
        next = [created, ...next].map((item, idx) => ({
          ...item,
          order: idx + 1,
        }));
      }

      return next;
    });
  }, []);

  const addSubtask = useCallback((todoId: string, title: string) => {
    const cleanTitle = sanitizeString(title, 150);
    if (!cleanTitle) return;
    const newSub: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: cleanTitle,
      completed: false,
    };
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      return {
        ...t,
        subtasks: [...t.subtasks, newSub],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const deleteSubtask = useCallback((todoId: string, subtaskId: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      return {
        ...t,
        subtasks: t.subtasks.filter(st => st.id !== subtaskId),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  // Selection & Bulk actions
  const toggleSelectTodo = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkDelete = useCallback(() => {
    setTodos(prev => prev.filter(t => !selectedIds.has(t.id)));
    clearSelection();
  }, [selectedIds, clearSelection]);

  const bulkToggleComplete = useCallback((status: boolean) => {
    const now = new Date().toISOString();
    const ids = Array.from(selectedIds);
    setTodos(prev => {
      const spawnedList: TodoItem[] = [];
      const updated = prev.map(t => {
        if (selectedIds.has(t.id)) {
          const becomingCompleted = status && !t.completed;
          const updatedItem: TodoItem = {
            ...t,
            completed: status,
            completedAt: status ? now : undefined,
            archived: status ? t.archived : false,
            archivedAt: status ? t.archivedAt : undefined,
            updatedAt: now,
          };
          if (becomingCompleted && updatedItem.frequency && updatedItem.frequency !== 'none') {
            const alreadySpawned = prev.some(existing => existing.recurrenceSourceId === t.id);
            if (!alreadySpawned) {
              const nextInstance = createRecurringTaskInstance(updatedItem);
              if (nextInstance) {
                spawnedList.push(nextInstance);
              }
            }
          }
          return updatedItem;
        }
        return t;
      });

      if (spawnedList.length > 0) {
        setLastRecreatedTodo(spawnedList[0]);
        return [...spawnedList, ...updated].map((item, idx) => ({
          ...item,
          order: idx + 1,
        }));
      }
      return updated;
    });
    fetch('/api/todos/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: status ? 'complete' : 'incomplete', ids }),
    }).catch(() => {});
    clearSelection();
  }, [selectedIds, clearSelection]);

  const bulkArchive = useCallback(() => {
    const now = new Date().toISOString();
    const ids = Array.from(selectedIds);
    setTodos(prev => prev.map(t => {
      if (selectedIds.has(t.id) && t.completed && !t.archived) {
        return {
          ...t,
          archived: true,
          archivedAt: now,
          updatedAt: now,
        };
      }
      return t;
    }));
    fetch('/api/todos/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive', ids }),
    }).catch(() => {});
    clearSelection();
  }, [selectedIds, clearSelection]);

  const bulkUnarchive = useCallback(() => {
    const now = new Date().toISOString();
    const ids = Array.from(selectedIds);
    setTodos(prev => prev.map(t => {
      if (selectedIds.has(t.id) && t.archived) {
        return {
          ...t,
          archived: false,
          archivedAt: undefined,
          updatedAt: now,
        };
      }
      return t;
    }));
    fetch('/api/todos/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unarchive', ids }),
    }).catch(() => {});
    clearSelection();
  }, [selectedIds, clearSelection]);

  const bulkChangeCategory = useCallback((category: Category) => {
    const now = new Date().toISOString();
    setTodos(prev => prev.map(t => {
      if (selectedIds.has(t.id)) {
        return { ...t, category, updatedAt: now };
      }
      return t;
    }));
    clearSelection();
  }, [selectedIds, clearSelection]);

  const bulkChangePriority = useCallback((priority: Priority) => {
    const now = new Date().toISOString();
    setTodos(prev => prev.map(t => {
      if (selectedIds.has(t.id)) {
        return { ...t, priority, updatedAt: now };
      }
      return t;
    }));
    clearSelection();
  }, [selectedIds, clearSelection]);

  // Export / Import / Reset
  const handleExport = useCallback(() => {
    return exportBackupData(todos);
  }, [todos]);

  const handleImport = useCallback((jsonString: string) => {
    const res = parseAndValidateBackup(jsonString);
    if (res.success && res.todos.length > 0) {
      setTodos(res.todos);
      return { success: true, count: res.todos.length };
    }
    return { success: false, error: res.error || 'Import failed' };
  }, []);

  const resetTodos = useCallback(() => {
    setTodos(INITIAL_TODOS);
    clearSelection();
  }, [clearSelection]);

  // Filter & Search logic
  const filteredTodos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return todos.filter(t => {
      // 1. Archive separation: Archived tasks only appear in the 'archived' view,
      // preventing main views ('all', 'today', 'upcoming', 'urgent', 'completed') from becoming cluttered.
      if (filterView === 'archived') {
        if (!t.archived) return false;
      } else {
        if (t.archived) return false;
      }

      // 2. Filter View
      if (filterView === 'today') {
        if (t.dueDate !== todayStr) return false;
      } else if (filterView === 'upcoming') {
        if (!t.dueDate || t.dueDate <= todayStr || t.completed) return false;
      } else if (filterView === 'completed') {
        if (!t.completed) return false;
      } else if (filterView === 'urgent') {
        if (t.priority !== 'urgent' || t.completed) return false;
      }

      // 3. Category Filter
      if (categoryFilter !== 'all') {
        if (t.category !== categoryFilter) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description ? t.description.toLowerCase().includes(q) : false;
        const matchesTags = t.tags.some(tag => tag.includes(q));
        const matchesCategory = t.category.toLowerCase().includes(q);
        const matchesSubtasks = t.subtasks.some(st => st.title.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesCategory && !matchesSubtasks) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rank') {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'dueDate') {
        // null due dates come last
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'priority') {
        const weight: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return weight[b.priority] - weight[a.priority];
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // createdAt default
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [todos, filterView, categoryFilter, searchQuery, sortBy]);

  // Productivity Metrics (preserves historical record-keeping including archived tasks)
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const archived = todos.filter(t => Boolean(t.archived)).length;
    const completedUnarchived = todos.filter(t => t.completed && !t.archived).length;
    const active = todos.filter(t => !t.completed && !t.archived).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const completedToday = todos.filter(t => isTaskCompletedToday(t, todayStr)).length;
    const dailyGoalProgress = dailyGoal > 0 ? Math.min(100, Math.round((completedToday / dailyGoal) * 100)) : 0;
    const dailyGoalMet = dailyGoal > 0 && completedToday >= dailyGoal;
    const dueToday = todos.filter(t => !t.completed && !t.archived && t.dueDate === todayStr).length;
    const urgent = todos.filter(t => !t.completed && !t.archived && t.priority === 'urgent').length;
    const overdue = todos.filter(t => !t.completed && !t.archived && t.dueDate && t.dueDate < todayStr).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total estimated minutes remaining
    const remainingMinutes = todos
      .filter(t => !t.completed && !t.archived && t.estimatedMinutes)
      .reduce((acc, curr) => acc + (curr.estimatedMinutes || 0), 0);

    return {
      total,
      completed,
      completedToday,
      dailyGoal,
      dailyGoalProgress,
      dailyGoalMet,
      archived,
      completedUnarchived,
      active,
      dueToday,
      urgent,
      overdue,
      completionRate,
      remainingMinutes,
    };
  }, [todos, dailyGoal]);

  return {
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
    clearRecreatedNotification: () => setLastRecreatedTodo(null),
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
    getTaskDependencyStatus,
    handleExport,
    handleImport,
    resetTodos,
  };
}
