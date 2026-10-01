import { Router, Request, Response } from 'express';
import { todoStore } from '../store';
import { ApiResponse, TodoItem, Priority, Category, Subtask } from '../types';
import { validateAndSanitizeTodo, sanitizeString, createRecurringTaskInstance } from '../utils/security';

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
  const { category, priority, completed, archived, frequency, tag, search } = req.query;

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

  if (typeof archived === 'string') {
    const isArchived = archived === 'true';
    list = list.filter(t => Boolean(t.archived) === isArchived);
  }

  if (typeof frequency === 'string' && frequency !== 'all') {
    list = list.filter(t => (t.frequency || 'none') === frequency);
  }

  if (typeof tag === 'string' && tag.trim() && tag !== 'all') {
    const targetTag = tag.toLowerCase().trim();
    list = list.filter(t => t.tags.includes(targetTag));
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

  if (!validated.completed && validated.archived) {
    validated.archived = false;
    validated.archivedAt = undefined;
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

  // Prevent archiving an incomplete task
  if (req.body.archived === true && !validated.completed) {
    return sendResponse(res, 422, {
      success: false,
      error: 'Only completed tasks can be moved to the archive',
      code: 'TASK_NOT_COMPLETED',
    });
  }

  // Automatically unarchive if task is marked incomplete
  if (!validated.completed) {
    validated.archived = false;
    validated.archivedAt = undefined;
  }

  // Prevent completion of task if its prerequisite dependencies are still active
  if (validated.completed && !existing.completed) {
    const deps = validated.dependencyIds || [];
    const activeDependencies: { id: string; title: string }[] = [];
    for (const depId of deps) {
      const depItem = todoStore.getById(depId);
      if (depItem && !depItem.completed) {
        activeDependencies.push({ id: depItem.id, title: depItem.title });
      }
    }
    if (activeDependencies.length > 0) {
      return sendResponse(res, 422, {
        success: false,
        error: `Cannot complete task while active prerequisite dependencies remain uncompleted: "${activeDependencies[0].title}"`,
        code: 'DEPENDENCIES_UNRESOLVED',
        data: { activeDependencies },
      });
    }
  }

  todoStore.set(validated);

  // Automatically recreate next occurrence when a recurring task is completed
  if (validated.completed && !existing.completed && validated.frequency && validated.frequency !== 'none') {
    const alreadySpawned = todoStore.getAll().some(t => t.recurrenceSourceId === existing.id);
    if (!alreadySpawned) {
      const nextInstance = createRecurringTaskInstance(validated);
      if (nextInstance) {
        todoStore.set(nextInstance);
      }
    }
  }

  return sendResponse(res, 200, { success: true, data: validated });
});

// 5. DELETE /api/todos/:id
router.delete('/:id', (req: Request, res: Response) => {
  const exists = todoStore.getById(req.params.id);
  if (!exists) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }

  todoStore.delete(req.params.id);

  // Clean up any references to this task in other tasks' dependencyIds
  for (const item of todoStore.getAll()) {
    if (item.dependencyIds && item.dependencyIds.includes(req.params.id)) {
      todoStore.set({
        ...item,
        dependencyIds: item.dependencyIds.filter(depId => depId !== req.params.id),
      });
    }
  }

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
    const currentAll = todoStore.getAll();
    for (const item of currentAll) {
      if (targetSet.has(item.id)) {
        const wasCompleted = item.completed;
        const updatedItem: TodoItem = {
          ...item,
          completed: isCompleted,
          completedAt: isCompleted ? now : undefined,
          archived: isCompleted ? item.archived : false,
          archivedAt: isCompleted ? item.archivedAt : undefined,
          updatedAt: now,
        };
        todoStore.set(updatedItem);
        affected++;

        if (isCompleted && !wasCompleted && updatedItem.frequency && updatedItem.frequency !== 'none') {
          const alreadySpawned = todoStore.getAll().some(t => t.recurrenceSourceId === item.id);
          if (!alreadySpawned) {
            const nextInstance = createRecurringTaskInstance(updatedItem);
            if (nextInstance) {
              todoStore.set(nextInstance);
            }
          }
        }
      }
    }
  } else if (action === 'archive') {
    for (const item of todoStore.getAll()) {
      if (targetSet.has(item.id) && item.completed && !item.archived) {
        todoStore.set({
          ...item,
          archived: true,
          archivedAt: now,
          updatedAt: now,
        });
        affected++;
      }
    }
  } else if (action === 'unarchive') {
    for (const item of todoStore.getAll()) {
      if (targetSet.has(item.id) && item.archived) {
        todoStore.set({
          ...item,
          archived: false,
          archivedAt: undefined,
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

// 9. POST /api/todos/reorder
router.post('/reorder', (req: Request, res: Response) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return sendResponse(res, 400, { success: false, error: 'orderedIds must be a non-empty array of task IDs', code: 'INVALID_ORDERED_IDS' });
  }

  // Validate that all elements in orderedIds are non-empty strings
  const areAllStrings = orderedIds.every(id => typeof id === 'string' && id.trim().length > 0);
  if (!areAllStrings) {
    return sendResponse(res, 400, { success: false, error: 'All orderedIds must be valid non-empty string IDs', code: 'INVALID_ID_TYPE' });
  }

  const now = new Date().toISOString();
  let updatedCount = 0;

  orderedIds.forEach((id: string, index: number) => {
    const item = todoStore.getById(id);
    if (item) {
      todoStore.set({
        ...item,
        order: index + 1,
        updatedAt: now,
      });
      updatedCount++;
    }
  });

  return sendResponse(res, 200, {
    success: true,
    data: {
      reorderedCount: updatedCount,
      totalRequested: orderedIds.length,
    },
  });
});

// 10. POST /api/todos/archive-completed
router.post('/archive-completed', (_req: Request, res: Response) => {
  const now = new Date().toISOString();
  const archivedIds: string[] = [];

  for (const item of todoStore.getAll()) {
    if (item.completed && !item.archived) {
      todoStore.set({
        ...item,
        archived: true,
        archivedAt: now,
        updatedAt: now,
      });
      archivedIds.push(item.id);
    }
  }

  return sendResponse(res, 200, {
    success: true,
    data: {
      archivedCount: archivedIds.length,
      archivedIds,
    },
  });
});

// 11. POST /api/todos/:id/archive
router.post('/:id/archive', (req: Request, res: Response) => {
  const existing = todoStore.getById(req.params.id);
  if (!existing) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }

  if (!existing.completed) {
    return sendResponse(res, 422, {
      success: false,
      error: 'Only completed tasks can be moved to the archive',
      code: 'TASK_NOT_COMPLETED',
    });
  }

  const now = new Date().toISOString();
  const updated: TodoItem = {
    ...existing,
    archived: true,
    archivedAt: existing.archivedAt || now,
    updatedAt: now,
  };

  todoStore.set(updated);
  return sendResponse(res, 200, { success: true, data: updated });
});

// 12. POST /api/todos/:id/unarchive
router.post('/:id/unarchive', (req: Request, res: Response) => {
  const existing = todoStore.getById(req.params.id);
  if (!existing) {
    return sendResponse(res, 404, { success: false, error: 'Todo not found', code: 'NOT_FOUND' });
  }

  const now = new Date().toISOString();
  const updated: TodoItem = {
    ...existing,
    archived: false,
    archivedAt: undefined,
    updatedAt: now,
  };

  todoStore.set(updated);
  return sendResponse(res, 200, { success: true, data: updated });
});

export default router;
