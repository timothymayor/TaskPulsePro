import { TodoItem } from './types';

export class TodoStore {
  private todos: Map<string, TodoItem> = new Map();

  constructor() {
    this.seed();
  }

  seed(): void {
    this.todos.clear();
    const now = new Date();
    const sampleItems: TodoItem[] = [
      {
        id: 'tp-1',
        title: 'Audit application Content Security Policy & CI/CD deployment pipeline',
        description: 'Ensure CSP headers, Strict-Transport-Security, and GitHub Actions workflow conform to production stability standards.',
        completed: false,
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000).toISOString(),
        dueDate: now.toISOString().split('T')[0],
        priority: 'urgent',
        category: 'work',
        subtasks: [
          { id: 'st-1', title: 'Verify XSS and input sanitization boundaries', completed: true },
          { id: 'st-2', title: 'Configure Vercel cache and security headers', completed: true },
          { id: 'st-3', title: 'Test GitHub Actions automated build pipeline', completed: false },
        ],
        estimatedMinutes: 45,
        tags: ['devops', 'security'],
      },
      {
        id: 'tp-2',
        title: 'Review quarterly financial balance sheet and operating expenses',
        description: 'Reconcile invoice statements with bank transactions before monthly close.',
        completed: false,
        createdAt: new Date(now.getTime() - 172800000).toISOString(),
        updatedAt: new Date(now.getTime() - 172800000).toISOString(),
        dueDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        priority: 'high',
        category: 'finance',
        subtasks: [
          { id: 'st-4', title: 'Export Stripe and AWS cost breakdown', completed: true },
          { id: 'st-5', title: 'Verify contractor payment receipts', completed: false },
        ],
        estimatedMinutes: 60,
        tags: ['finance', 'reporting'],
      },
      {
        id: 'tp-3',
        title: 'Morning 5km endurance run and mobility stretching',
        description: 'Maintain cardio fitness baseline and lower-back recovery exercises.',
        completed: true,
        completedAt: new Date(now.getTime() - 21600000).toISOString(),
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 21600000).toISOString(),
        dueDate: now.toISOString().split('T')[0],
        priority: 'medium',
        category: 'health',
        subtasks: [
          { id: 'st-6', title: 'Warm-up dynamic stretching', completed: true },
          { id: 'st-7', title: '5km steady pace', completed: true },
          { id: 'st-8', title: 'Post-run hydration and foam roll', completed: true },
        ],
        estimatedMinutes: 40,
        tags: ['health', 'routine'],
      },
    ];

    for (const item of sampleItems) {
      this.todos.set(item.id, item);
    }
  }

  getAll(): TodoItem[] {
    return Array.from(this.todos.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getById(id: string): TodoItem | undefined {
    return this.todos.get(id);
  }

  set(todo: TodoItem): void {
    this.todos.set(todo.id, todo);
  }

  delete(id: string): boolean {
    return this.todos.delete(id);
  }

  replaceAll(todos: TodoItem[]): void {
    this.todos.clear();
    for (const item of todos) {
      this.todos.set(item.id, item);
    }
  }

  clear(): void {
    this.todos.clear();
  }
}

export const todoStore = new TodoStore();
