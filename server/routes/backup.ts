import { Router, Request, Response } from 'express';
import { todoStore } from '../store';
import { ApiResponse, TodoItem } from '../types';
import { computeChecksum, validateAndSanitizeTodo } from '../utils/security';

const router = Router();

router.get('/export', (_req: Request, res: Response) => {
  const allTodos = todoStore.getAll();
  const checksum = computeChecksum(allTodos);

  const payload = {
    version: '2.4.0',
    itemCount: allTodos.length,
    exportedAt: new Date().toISOString(),
    checksum,
    todos: allTodos,
  };

  const body: ApiResponse<typeof payload> = {
    success: true,
    data: payload,
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(body);
});

router.post('/import', (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON request structure',
      timestamp: new Date().toISOString(),
    });
  }

  const rawList = Array.isArray(req.body)
    ? req.body
    : (Array.isArray(req.body.todos) ? req.body.todos : null);

  if (!rawList || rawList.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Backup payload must contain a non-empty array of todo items',
      timestamp: new Date().toISOString(),
    });
  }

  const validatedItems: TodoItem[] = [];
  for (const raw of rawList) {
    const item = validateAndSanitizeTodo(raw);
    if (item) {
      validatedItems.push(item);
    }
  }

  if (validatedItems.length === 0) {
    return res.status(422).json({
      success: false,
      error: 'No valid todo records found in import payload',
      timestamp: new Date().toISOString(),
    });
  }

  todoStore.replaceAll(validatedItems);

  return res.status(200).json({
    success: true,
    data: {
      importedCount: validatedItems.length,
      checksum: computeChecksum(validatedItems),
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
