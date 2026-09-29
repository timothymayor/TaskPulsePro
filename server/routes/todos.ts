import { Router, Request, Response } from 'express';
import { todoStore } from '../store';
import { ApiResponse, TodoItem, Priority, Category, Subtask } from '../types';
import { validateAndSanitizeTodo, sanitizeString } from '../utils/security';

const router = Router();

function sendResponse<T>(res: Response, status: number, payload: { success: boolean; data?: T; error?: string; code?: string }) {
  const body: ApiResponse<T> = {
    ...payload,
    timestamp: new Date().toISOString(),
  };
  return res.status(status).json(body);
}

// 1. GET /api/todos
router.get('/', (req: Request, res: Response) => {
  let list = todoStore.getAll();
  const { category, priority, completed, search } = req.query;

  if (typeof category === 'string' && category !== 'all') {
    list = list.filter(t => t.category === category);
  }

  if (typeof priority === 'string' && priority !== 'all') {
    list = list.filter(t => t.priority === priority);
  }

  if (typeof completed === 'string') {
    const isCompleted = completed === 'true';
    list = list.filter(t => t.completed === isCompleted);
  }

  if (typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.tags.some(tag => tag.includes(q))
    );
  }

  return sendResponse(res, 200, { success: true, data: list });
});

// 2. GET /api/todos/:id
router.get('/:id', (req: Request, res: Response) => {
  const item = todoStore.getById(req.params.id);
  if (!item) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }
  return sendResponse(res, 200, { success: true, data: item });
});

// 3. POST /api/todos
router.post('/', (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') {
    return sendResponse(res, 400, { success: false, error: 'Malformed request body', code: 'INVALID_BODY' });
  }

  const validated = validateAndSanitizeTodo(req.body);
  if (!validated) {
    return sendResponse(res, 400, { success: false, error: 'Valid title is required', code: 'VALIDATION_FAILED' });
  }

  todoStore.set(validated);
  return sendResponse(res, 201, { success: true, data: validated });
});

// 4. PUT /api/todos/:id
router.put('/:id', (req: Request, res: Response) => {
  const existing = todoStore.getById(req.params.id);
  if (!existing) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }

  if (!req.body || typeof req.body !== 'object') {
    return sendResponse(res, 400, { success: false, error: 'Malformed request body', code: 'INVALID_BODY' });
  }

  const merged = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const validated = validateAndSanitizeTodo(merged);
  if (!validated) {
    return sendResponse(res, 400, { success: false, error: 'Validation failed on updated fields', code: 'VALIDATION_FAILED' });
  }

  todoStore.set(validated);
  return sendResponse(res, 200, { success: true, data: validated });
});

// 5. DELETE /api/todos/:id
router.delete('/:id', (req: Request, res: Response) => {
  const exists = todoStore.getById(req.params.id);
  if (!exists) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }

  todoStore.delete(req.params.id);
  return sendResponse(res, 200, { success: true, data: { deletedId: req.params.id } });
});

// 6. POST /api/todos/:id/subtasks
router.post('/:id/subtasks', (req: Request, res: Response) => {
  const existing = todoStore.getById(req.params.id);
  if (!existing) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }

  const rawTitle = req.body && typeof req.body.title === 'string' ? req.body.title : '';
  const cleanTitle = sanitizeString(rawTitle, 150);
  if (!cleanTitle) {
    return sendResponse(res, 400, { success: false, error: 'Subtask title cannot be empty', code: 'EMPTY_SUBTASK_TITLE' });
  }

  const newSubtask: Subtask = {
    id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: cleanTitle,
    completed: false,
  };

  const updated: TodoItem = {
    ...existing,
    subtasks: [...existing.subtasks, newSubtask],
    updatedAt: new Date().toISOString(),
  };

  todoStore.set(updated);
  return sendResponse(res, 200, { success: true, data: updated });
});

// 7. PATCH /api/todos/:id/subtasks/:subtaskId
router.patch('/:id/subtasks/:subtaskId', (req: Request, res: Response) => {
  const existing = todoStore.getById(req.params.id);
  if (!existing) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }

  const subtaskIndex = existing.subtasks.findIndex(st => st.id === req.params.subtaskId);
  if (subtaskIndex === -1) {
    return sendResponse(res, 404, { success: false, error: 'Subtask not found', code: 'SUBTASK_NOT_FOUND' });
  }

  const updatedSubtasks = existing.subtasks.map((st, i) =>
    i === subtaskIndex ? { ...st, completed: !st.completed } : st
  );

  const updated: TodoItem = {
    ...existing,
    subtasks: updatedSubtasks,
    updatedAt: new Date().toISOString(),
  };

  todoStore.set(updated);
  return sendResponse(res, 200, { success: true, data: updated });
});

// 8. POST /api/todos/bulk
router.post('/bulk', (req: Request, res: Response) => {
  const { action, ids, priority, category } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return sendResponse(res, 400, { success: false, error: 'Target ids must be a non-empty array', code: 'INVALID_IDS' });
  }

  const targetSet = new Set(ids);
  let affected = 0;
  const now = new Date().toISOString();

  if (action === 'delete') {
    for (const id of targetSet) {
      if (todoStore.delete(id)) affected++;
    }
  } else if (action === 'complete' || action === 'incomplete') {
    const isCompleted = action === 'complete';
    for (const item of todoStore.getAll()) {
      if (targetSet.has(item.id)) {
        todoStore.set({
          ...item,
          completed: isCompleted,
          completedAt: isCompleted ? now : undefined,
          updatedAt: now,
        });
        affected++;
      }
    }
  } else if (action === 'priority' && typeof priority === 'string') {
    const validPri: Priority[] = ['low', 'medium', 'high', 'urgent'];
    if (!validPri.includes(priority as Priority)) {
      return sendResponse(res, 400, { success: false, error: 'Invalid priority level', code: 'INVALID_PRIORITY' });
    }
    for (const item of todoStore.getAll()) {
      if (targetSet.has(item.id)) {
        todoStore.set({ ...item, priority: priority as Priority, updatedAt: now });
        affected++;
      }
    }
  } else if (action === 'category' && typeof category === 'string') {
    const validCat: Category[] = ['work', 'personal', 'finance', 'health', 'learning', 'errands'];
    if (!validCat.includes(category as Category)) {
      return sendResponse(res, 400, { success: false, error: 'Invalid category', code: 'INVALID_CATEGORY' });
    }
    for (const item of todoStore.getAll()) {
      if (targetSet.has(item.id)) {
        todoStore.set({ ...item, category: category as Category, updatedAt: now });
        affected++;
      }
    }
  } else {
    return sendResponse(res, 400, { success: false, error: 'Invalid or unsupported bulk action', code: 'UNKNOWN_ACTION' });
  }

  return sendResponse(res, 200, { success: true, data: { affectedCount: affected } });
});

export default router;
