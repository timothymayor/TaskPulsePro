import { TodoItem, BackupData } from '../types/todo';
import { validateTodoItem, computeChecksum, sanitizeString } from './security';

const STORAGE_KEY = 'taskpulse_todos_v2';
const THEME_KEY = 'taskpulse_theme_v2';

export const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'tp-task-1',
    title: 'Audit application Content Security Policy & CI/CD deployment pipeline',
    description: 'Ensure CSP headers, Strict-Transport-Security, and GitHub Actions workflow conform to production stability standards.',
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'urgent',
    category: 'work',
    subtasks: [
      { id: 'sub-1', title: 'Verify XSS and input sanitization boundaries', completed: true },
      { id: 'sub-2', title: 'Configure Vercel cache and security headers', completed: true },
      { id: 'sub-3', title: 'Test GitHub Actions automated build pipeline', completed: false },
    ],
    estimatedMinutes: 45,
    tags: ['devops', 'security'],
  },
  {
    id: 'tp-task-2',
    title: 'Review quarterly financial balance sheet and operating expenses',
    description: 'Reconcile invoice statements with bank transactions before monthly close.',
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    dueDate: new Date(Date.now() + 3600000 * 24).toISOString().split('T')[0],
    priority: 'high',
    category: 'finance',
    subtasks: [
      { id: 'sub-4', title: 'Export Stripe and AWS cost breakdown', completed: true },
      { id: 'sub-5', title: 'Verify contractor payment receipts', completed: false },
    ],
    estimatedMinutes: 60,
    tags: ['finance', 'reporting'],
  },
  {
    id: 'tp-task-3',
    title: 'Morning 5km endurance run and mobility stretching',
    description: 'Maintain cardio fitness baseline and lower-back recovery exercises.',
    completed: true,
    completedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    category: 'health',
    subtasks: [
      { id: 'sub-6', title: 'Warm-up dynamic stretching', completed: true },
      { id: 'sub-7', title: '5km steady pace', completed: true },
      { id: 'sub-8', title: 'Post-run hydration and foam roll', completed: true },
    ],
    estimatedMinutes: 40,
    tags: ['health', 'routine'],
  },
  {
    id: 'tp-task-4',
    title: 'Read chapter 4 of Designing Data-Intensive Applications',
    description: 'Encoding and Evolution: formats including Protocol Buffers, Avro, and schema compatibility.',
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    dueDate: new Date(Date.now() + 3600000 * 72).toISOString().split('T')[0],
    priority: 'low',
    category: 'learning',
    subtasks: [],
    estimatedMinutes: 30,
    tags: ['reading', 'architecture'],
  },
];

export function loadTodosFromStorage(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveTodosToStorage(INITIAL_TODOS);
      return INITIAL_TODOS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return INITIAL_TODOS;
    }

    const validated: TodoItem[] = [];
    for (const item of parsed) {
      const safe = validateTodoItem(item);
      if (safe) {
        validated.push(safe);
      }
    }

    if (validated.length === 0) {
      return INITIAL_TODOS;
    }

    return validated;
  } catch (error) {
    console.warn('Storage read exception, falling back to defaults:', error);
    return INITIAL_TODOS;
  }
}

export function saveTodosToStorage(todos: TodoItem[]): boolean {
  try {
    // Sanitize before saving
    const safeList = todos.map(validateTodoItem).filter((t): t is TodoItem => t !== null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeList));
    return true;
  } catch (error) {
    console.error('Failed to write to localStorage:', error);
    return false;
  }
}

export function loadThemePreference(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    console.warn('Unable to persist theme:', error);
  }
}

export function exportBackupData(todos: TodoItem[]): string {
  const safeTodos = todos.map(validateTodoItem).filter((t): t is TodoItem => t !== null);
  const payload: BackupData = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    itemCount: safeTodos.length,
    checksum: computeChecksum(safeTodos),
    todos: safeTodos,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskpulse_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return payload.checksum;
}

export function parseAndValidateBackup(jsonText: string): { success: boolean; todos: TodoItem[]; error?: string } {
  try {
    if (jsonText.length > 5 * 1024 * 1024) {
      return { success: false, todos: [], error: 'Backup file exceeds safe 5MB limit.' };
    }

    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, todos: [], error: 'Invalid JSON payload structure.' };
    }

    const rawList = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.todos) ? parsed.todos : null);
    if (!rawList) {
      return { success: false, todos: [], error: 'Could not find todo records list in backup.' };
    }

    const safeTodos: TodoItem[] = [];
    for (const raw of rawList) {
      const validated = validateTodoItem(raw);
      if (validated) {
        safeTodos.push(validated);
      }
    }

    if (safeTodos.length === 0) {
      return { success: false, todos: [], error: 'No valid task items could be parsed from backup.' };
    }

    return { success: true, todos: safeTodos };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'JSON parsing error';
    return { success: false, todos: [], error: `File parsing failed: ${sanitizeString(message, 100)}` };
  }
}
