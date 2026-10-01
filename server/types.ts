export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Category = 'work' | 'personal' | 'finance' | 'health' | 'learning' | 'errands';

export type TagColor = 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'indigo' | 'teal' | 'fuchsia';

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
  dueDate?: string;
  priority: Priority;
  category: Category;
  subtasks: Subtask[];
  estimatedMinutes?: number;
  tags: string[];
  tagColors?: Record<string, TagColor>;
  order?: number;
  dependencyIds?: string[];
  archived?: boolean;
  archivedAt?: string;
}

export type TaskItem = TodoItem;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}
