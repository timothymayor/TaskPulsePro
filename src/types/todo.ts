export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Category = 'work' | 'personal' | 'finance' | 'health' | 'learning' | 'errands';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string; // YYYY-MM-DD
  priority: Priority;
  category: Category;
  subtasks: Subtask[];
  estimatedMinutes?: number;
  tags: string[];
  order?: number;
  dependencyIds?: string[];
  archived?: boolean;
  archivedAt?: string;
}

export type TaskItem = TodoItem;

export type FilterView = 'all' | 'today' | 'upcoming' | 'completed' | 'urgent' | 'archived' | 'stats';

export type SortOption = 'rank' | 'priority' | 'dueDate' | 'createdAt' | 'title';

export interface SecurityCheckResult {
  id: string;
  title: string;
  category: 'XSS Defense' | 'Data Integrity' | 'Memory Safety' | 'Network Security' | 'OWASP Standards';
  passed: boolean;
  details: string;
  timestamp: string;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  itemCount: number;
  checksum: string;
  todos: TodoItem[];
}
