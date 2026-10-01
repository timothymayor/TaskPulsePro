import crypto from 'crypto';
import { TodoItem, Priority, Category, TagColor } from '../types';

const VALID_TAG_COLORS: TagColor[] = ['emerald', 'sky', 'violet', 'amber', 'rose', 'indigo', 'teal', 'fuchsia'];

export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }

  let cleaned = input.slice(0, maxLength);
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*[^>\s]+/gi, '');
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.replace(/vbscript\s*:/gi, '');
  cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, '');
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');

  return cleaned.trim();
}

export function computeChecksum(obj: unknown): string {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return crypto.createHash('sha256').update(str).digest('hex');
}

const VALID_PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const VALID_CATEGORIES: Category[] = ['work', 'personal', 'finance', 'health', 'learning', 'errands'];

export function validateAndSanitizeTodo(raw: unknown): TodoItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Block prototype pollution
  if ('__proto__' in obj || 'constructor' in obj || 'prototype' in obj) {
    // Drop malicious attempts
  }

  const rawTitle = typeof obj.title === 'string' ? obj.title : '';
  const safeTitle = sanitizeString(rawTitle, 200);
  if (!safeTitle) {
    return null;
  }

  const rawId = typeof obj.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(obj.id)
    ? obj.id
    : `tp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const rawDesc = typeof obj.description === 'string' ? obj.description : undefined;
  const safeDesc = rawDesc ? sanitizeString(rawDesc, 1000) : undefined;

  const safeCompleted = Boolean(obj.completed);
  const now = new Date().toISOString();
  const safeCreatedAt = typeof obj.createdAt === 'string' && !isNaN(Date.parse(obj.createdAt)) ? obj.createdAt : now;
  const safeUpdatedAt = typeof obj.updatedAt === 'string' && !isNaN(Date.parse(obj.updatedAt)) ? obj.updatedAt : now;
  const safeCompletedAt = obj.completedAt && typeof obj.completedAt === 'string' && !isNaN(Date.parse(obj.completedAt))
    ? obj.completedAt
    : safeCompleted ? now : undefined;

  let safeDueDate: string | undefined = undefined;
  if (typeof obj.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.dueDate)) {
    safeDueDate = obj.dueDate;
  }

  const rawPriority = obj.priority as Priority;
  const safePriority: Priority = VALID_PRIORITIES.includes(rawPriority) ? rawPriority : 'medium';

  const rawCategory = obj.category as Category;
  const safeCategory: Category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : 'work';

  const safeSubtasks: TodoItem['subtasks'] = [];
  if (Array.isArray(obj.subtasks)) {
    for (const sub of obj.subtasks.slice(0, 50)) {
      if (sub && typeof sub === 'object') {
        const subRecord = sub as Record<string, unknown>;
        const subTitle = sanitizeString(typeof subRecord.title === 'string' ? subRecord.title : '', 150);
        if (subTitle) {
          safeSubtasks.push({
            id: typeof subRecord.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(subRecord.id) ? subRecord.id : `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: subTitle,
            completed: Boolean(subRecord.completed),
          });
        }
      }
    }
  }

  let safeMinutes: number | undefined = undefined;
  if (typeof obj.estimatedMinutes === 'number' && Number.isFinite(obj.estimatedMinutes)) {
    safeMinutes = Math.max(5, Math.min(480, Math.round(obj.estimatedMinutes)));
  }

  const safeTags: string[] = [];
  if (Array.isArray(obj.tags)) {
    for (const t of obj.tags.slice(0, 10)) {
      if (typeof t === 'string') {
        const cleaned = sanitizeString(t, 30).toLowerCase();
        if (cleaned && !safeTags.includes(cleaned)) {
          safeTags.push(cleaned);
        }
      }
    }
  }

  let safeTagColors: Record<string, TagColor> | undefined = undefined;
  if (obj.tagColors && typeof obj.tagColors === 'object' && !Array.isArray(obj.tagColors)) {
    const rawColors = obj.tagColors as Record<string, unknown>;
    const cleanedMap: Record<string, TagColor> = {};
    for (const [k, v] of Object.entries(rawColors)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const cleanKey = sanitizeString(k, 30).toLowerCase();
      if (cleanKey && typeof v === 'string' && VALID_TAG_COLORS.includes(v as TagColor)) {
        cleanedMap[cleanKey] = v as TagColor;
      }
    }
    if (Object.keys(cleanedMap).length > 0) {
      safeTagColors = cleanedMap;
    }
  }

  let safeOrder: number | undefined = undefined;
  if (typeof obj.order === 'number' && Number.isFinite(obj.order)) {
    safeOrder = Math.max(1, Math.round(obj.order));
  }

  const safeDependencyIds: string[] = [];
  if (Array.isArray(obj.dependencyIds)) {
    for (const dep of obj.dependencyIds.slice(0, 20)) {
      if (typeof dep === 'string') {
        const cleanDep = dep.trim();
        if (/^[a-zA-Z0-9_-]{1,64}$/.test(cleanDep) && cleanDep !== rawId && !safeDependencyIds.includes(cleanDep)) {
          safeDependencyIds.push(cleanDep);
        }
      }
    }
  }

  const safeArchived = safeCompleted ? Boolean(obj.archived) : false;
  const safeArchivedAt = safeArchived
    ? (obj.archivedAt && typeof obj.archivedAt === 'string' && !isNaN(Date.parse(obj.archivedAt)) ? obj.archivedAt : now)
    : undefined;

  return {
    id: rawId,
    title: safeTitle,
    description: safeDesc,
    completed: safeCompleted,
    completedAt: safeCompletedAt,
    createdAt: safeCreatedAt,
    updatedAt: safeUpdatedAt,
    dueDate: safeDueDate,
    priority: safePriority,
    category: safeCategory,
    subtasks: safeSubtasks,
    estimatedMinutes: safeMinutes,
    tags: safeTags,
    tagColors: safeTagColors,
    order: safeOrder,
    dependencyIds: safeDependencyIds,
    archived: safeArchived,
    archivedAt: safeArchivedAt,
  };
}
