import { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { TodoItem, Priority, Category, FilterView, SortOption, Subtask } from '../types/todo';
import { loadTodosFromStorage, saveTodosToStorage, INITIAL_TODOS, exportBackupData, parseAndValidateBackup } from '../utils/storage';
import { sanitizeString, validateTodoItem } from '../utils/security';

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>(() => loadTodosFromStorage());
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastDeletedTodo, setLastDeletedTodo] = useState<TodoItem | null>(null);

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

  // Add todo
  const addTodo = useCallback((data: {
    title: string;
    description?: string;
    priority?: Priority;
    category?: Category;
    dueDate?: string;
    estimatedMinutes?: number;
    subtasks?: string[];
    tags?: string[];
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
    };

    setTodos(prev => [newTodo, ...prev]);
    return newTodo;
  }, []);

  // Toggle completed status
  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => {
      const target = prev.find(t => t.id === id);
      const willBeCompleted = target ? !target.completed : false;
      const now = new Date().toISOString();

      const next = prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            completed: willBeCompleted,
            completedAt: willBeCompleted ? now : undefined,
            updatedAt: now,
          };
        }
        return t;
      });

      if (willBeCompleted) {
        // If all tasks are now completed, fire confetti
        const remainingActive = next.filter(t => !t.completed).length;
        if (remainingActive === 0) {
          triggerCelebration();
        }
      }

      return next;
    });
  }, [triggerCelebration]);

  // Update todo
  const updateTodo = useCallback((id: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>) => {
    setTodos(prev => {
      const now = new Date().toISOString();
      return prev.map(t => {
        if (t.id !== id) return t;
        const merged = {
          ...t,
          ...updates,
          title: updates.title !== undefined ? sanitizeString(updates.title, 200) : t.title,
          description: updates.description !== undefined ? sanitizeString(updates.description, 1000) : t.description,
          updatedAt: now,
        };
        const validated = validateTodoItem(merged);
        return validated || t;
      });
    });
  }, []);

  // Delete single todo with undo buffer
  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => {
      const toDelete = prev.find(t => t.id === id);
      if (toDelete) {
        setLastDeletedTodo(toDelete);
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  // Undo delete
  const undoDelete = useCallback(() => {
    if (!lastDeletedTodo) return;
    setTodos(prev => [lastDeletedTodo, ...prev]);
    setLastDeletedTodo(null);
  }, [lastDeletedTodo]);

  // Subtask management
  const toggleSubtask = useCallback((todoId: string, subtaskId: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      const updatedSubtasks = t.subtasks.map(st => {
        if (st.id === subtaskId) {
          return { ...st, completed: !st.completed };
        }
        return st;
      });
      // Check if all subtasks completed
      const allSubtasksDone = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
      return {
        ...t,
        subtasks: updatedSubtasks,
        completed: allSubtasksDone ? true : t.completed,
        updatedAt: new Date().toISOString(),
      };
    }));
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
    setTodos(prev => prev.map(t => {
      if (selectedIds.has(t.id)) {
        return {
          ...t,
          completed: status,
          completedAt: status ? now : undefined,
          updatedAt: now,
        };
      }
      return t;
    }));
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
      // 1. Filter View
      if (filterView === 'today') {
        if (t.dueDate !== todayStr) return false;
      } else if (filterView === 'upcoming') {
        if (!t.dueDate || t.dueDate <= todayStr || t.completed) return false;
      } else if (filterView === 'completed') {
        if (!t.completed) return false;
      } else if (filterView === 'urgent') {
        if (t.priority !== 'urgent' || t.completed) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== 'all') {
        if (t.category !== categoryFilter) return false;
      }

      // 3. Search Query
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

  // Productivity Metrics
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;
    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = todos.filter(t => !t.completed && t.dueDate === todayStr).length;
    const urgent = todos.filter(t => !t.completed && t.priority === 'urgent').length;
    const overdue = todos.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total estimated minutes remaining
    const remainingMinutes = todos
      .filter(t => !t.completed && t.estimatedMinutes)
      .reduce((acc, curr) => acc + (curr.estimatedMinutes || 0), 0);

    return {
      total,
      completed,
      active,
      dueToday,
      urgent,
      overdue,
      completionRate,
      remainingMinutes,
    };
  }, [todos]);

  return {
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
  };
}
