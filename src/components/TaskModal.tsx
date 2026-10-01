import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Shield, Calendar, Clock, Tag, GripVertical, ChevronUp, ChevronDown, ListOrdered, Link2, Repeat } from 'lucide-react';
import { TodoItem, Priority, Category, TagColor, RecurrenceFrequency } from '../types/todo';
import { sanitizeString, computeNextDueDate } from '../utils/security';
import { TAG_COLOR_OPTIONS, TAG_COLOR_STYLES, getTagStyle, resolveTagColor } from '../utils/tags';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    priority: Priority;
    category: Category;
    dueDate?: string;
    estimatedMinutes?: number;
    subtasks?: string[];
    tags?: string[];
    tagColors?: Record<string, TagColor>;
    order?: number;
    dependencyIds?: string[];
    frequency?: RecurrenceFrequency;
  }) => void;
  initialTodo?: TodoItem | null;
  totalTasksCount?: number;
  availableTasks?: TodoItem[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTodo,
  totalTasksCount = 4,
  availableTasks = [],
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('work');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('none');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<Record<string, TagColor>>({});
  const [selectedTagColor, setSelectedTagColor] = useState<TagColor | 'auto'>('auto');
  const [tagInput, setTagInput] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);
  const [selectedDepToAdd, setSelectedDepToAdd] = useState<string>('');
  const [draggedSubtaskIdx, setDraggedSubtaskIdx] = useState<number | null>(null);

  // Candidate tasks that can be linked as dependencies (exclude self and already linked)
  const candidateTasks = availableTasks.filter(
    t => (!initialTodo || t.id !== initialTodo.id) && !dependencyIds.includes(t.id)
  );

  // Suggested tags derived from existing tasks for 1-click classification
  const availableTagSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const t of availableTasks) {
      if (Array.isArray(t.tags)) {
        for (const tag of t.tags) {
          if (tag && !tags.includes(tag)) {
            set.add(tag);
          }
        }
      }
    }
    const defaults = ['devops', 'security', 'frontend', 'backend', 'client', 'audit', 'feature'];
    for (const d of defaults) {
      if (!tags.includes(d)) {
        set.add(d);
      }
    }
    return Array.from(set).slice(0, 6);
  }, [availableTasks, tags]);

  // Populate form if editing
  useEffect(() => {
    if (initialTodo) {
      setTitle(initialTodo.title || '');
      setDescription(initialTodo.description || '');
      setPriority(initialTodo.priority || 'medium');
      setCategory(initialTodo.category || 'work');
      setDueDate(initialTodo.dueDate || '');
      setFrequency(initialTodo.frequency || 'none');
      setEstimatedMinutes(initialTodo.estimatedMinutes || '');
      setSubtasks(initialTodo.subtasks ? initialTodo.subtasks.map(s => s.title) : []);
      setTags(initialTodo.tags ? [...initialTodo.tags] : []);
      setTagColors(initialTodo.tagColors ? { ...initialTodo.tagColors } : {});
      setSelectedTagColor('auto');
      setTagInput('');
      setOrder(initialTodo.order || 1);
      setDependencyIds(initialTodo.dependencyIds || []);
      setSelectedDepToAdd('');
    } else {
      // Defaults for new task
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('work');
      setDueDate(new Date().toISOString().split('T')[0]);
      setFrequency('none');
      setEstimatedMinutes(30);
      setSubtasks([]);
      setTags([]);
      setTagColors({});
      setSelectedTagColor('auto');
      setTagInput('');
      setOrder(1); // Default to top of queue (#1)
      setDependencyIds([]);
      setSelectedDepToAdd('');
    }
  }, [initialTodo, isOpen, totalTasksCount]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    const cleaned = sanitizeString(subtaskInput, 150);
    if (cleaned) {
      setSubtasks(prev => [...prev, cleaned]);
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (idx: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveSubtask = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= subtasks.length) return;
    setSubtasks(prev => {
      const copy = [...prev];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const normalizeTagToken = (rawToken: string): string => {
    return sanitizeString(rawToken.trim(), 30)
      .toLowerCase()
      .replace(/^#+/, '')
      .trim();
  };

  const handleAddTag = (tagToAdd?: string) => {
    const raw = tagToAdd !== undefined ? tagToAdd : tagInput;
    if (!raw.trim()) return;

    const tokens = raw
      .split(',')
      .map(normalizeTagToken)
      .filter(Boolean);

    if (tokens.length === 0) return;

    setTags(prev => {
      const nextSet = new Set(prev);
      for (const token of tokens) {
        if (nextSet.size < 10) {
          nextSet.add(token);
        }
      }
      return Array.from(nextSet);
    });

    setTagColors(prev => {
      const nextColors = { ...prev };
      for (const token of tokens) {
        if (selectedTagColor !== 'auto') {
          nextColors[token] = selectedTagColor;
        } else if (!nextColors[token]) {
          nextColors[token] = resolveTagColor(token, prev);
        }
      }
      return nextColors;
    });

    setTagInput('');
  };

  const handleCycleTagColor = (tag: string) => {
    const current = resolveTagColor(tag, tagColors);
    const currentIdx = TAG_COLOR_OPTIONS.indexOf(current);
    const nextColor = TAG_COLOR_OPTIONS[(currentIdx + 1) % TAG_COLOR_OPTIONS.length];
    setTagColors(prev => ({
      ...prev,
      [tag]: nextColor,
    }));
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      e.preventDefault();
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeString(title, 200);
    if (!cleanTitle) return;

    // Collect any remaining text in tagInput before submitting
    const pendingTokens = tagInput
      .split(',')
      .map(normalizeTagToken)
      .filter(Boolean);

    const mergedTags = Array.from(new Set([...tags, ...pendingTokens])).slice(0, 10);
    const mergedTagColors: Record<string, TagColor> = {};
    for (const t of mergedTags) {
      mergedTagColors[t] =
        tagColors[t] ||
        (selectedTagColor !== 'auto' && pendingTokens.includes(t)
          ? selectedTagColor
          : resolveTagColor(t, tagColors));
    }

    onSubmit({
      title: cleanTitle,
      description: description ? sanitizeString(description, 1000) : undefined,
      priority,
      category,
      dueDate: dueDate || undefined,
      estimatedMinutes: typeof estimatedMinutes === 'number' && estimatedMinutes > 0 ? estimatedMinutes : undefined,
      subtasks,
      tags: mergedTags,
      tagColors: Object.keys(mergedTagColors).length > 0 ? mergedTagColors : undefined,
      order: typeof order === 'number' && order > 0 ? order : 1,
      dependencyIds,
      frequency,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {initialTodo ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Inputs are automatically sanitized against XSS injection vectors.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="task-title" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                {title.length}/200
              </span>
            </div>
            <input
              id="task-title"
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 200))}
              placeholder="e.g., Finalize security compliance documentation"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-description" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Notes & Description (Optional)
            </label>
            <textarea
              id="task-description"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 1000))}
              placeholder="Add relevant context, acceptance criteria, or reference URLs..."
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
            />
          </div>

          {/* Two-column Row: Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label htmlFor="task-category" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Category
              </label>
              <select
                id="task-category"
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
              >
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="finance">Finance</option>
                <option value="health">Health</option>
                <option value="learning">Learning</option>
                <option value="errands">Errands</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="task-priority" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Priority Level
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
              >
                <option value="low">Low (Someday)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="high">High (Important)</option>
                <option value="urgent">Urgent (Immediate)</option>
              </select>
            </div>
          </div>

          {/* Priority Queue Order & Numerical Rank */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-800/40">
            <div className="flex items-center justify-between">
              <label htmlFor="task-priority-rank" className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                <ListOrdered className="h-3.5 w-3.5 text-neutral-500" />
                Priority Rank & Queue Position
              </label>
              <span className="font-mono tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                Position #{order} {order === 1 ? '· Top Priority' : ''}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Rank determines order in your queue. Placing at #1 moves this task to the top.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOrder(1)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  order === 1
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 font-semibold'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                #1 Top Next
              </button>
              <button
                type="button"
                onClick={() => setOrder(2)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  order === 2
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 font-semibold'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                #2 Second
              </button>
              <button
                type="button"
                onClick={() => setOrder(Math.max(1, totalTasksCount + (initialTodo ? 0 : 1)))}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  order >= totalTasksCount + (initialTodo ? 0 : 1)
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 font-semibold'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                #{totalTasksCount + (initialTodo ? 0 : 1)} End of Queue
              </button>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-neutral-500 font-mono">Custom Rank:</span>
                <input
                  id="task-priority-rank"
                  type="number"
                  min="1"
                  max="999"
                  value={order}
                  onChange={e => setOrder(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-mono tabular-nums text-neutral-900 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100 text-center"
                />
              </div>
            </div>
          </div>

          {/* Three-column Row: Due Date, Recurrence Frequency & Estimated Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="task-due-date" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Due Date
              </label>
              <div className="relative mt-1">
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="task-frequency" className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <Repeat className="h-3 w-3 text-neutral-500" />
                <span>Recurrence</span>
              </label>
              <select
                id="task-frequency"
                value={frequency}
                onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
              >
                <option value="none">One-time (No repeat)</option>
                <option value="daily">Daily (Every day)</option>
                <option value="weekly">Weekly (Every 7 days)</option>
                <option value="monthly">Monthly (Every month)</option>
              </select>
              {frequency !== 'none' && (
                <p className="mt-1 text-[11px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                  Next: {computeNextDueDate(dueDate || undefined, frequency)}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="task-duration" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Focus Time (mins)
              </label>
              <input
                id="task-duration"
                type="number"
                min="5"
                max="480"
                step="5"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g., 30"
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
              />
            </div>
          </div>

          {/* Subtasks Builder with Drag & Drop */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Checklist Steps / Subtasks
              </label>
              {subtasks.length > 1 && (
                <span className="text-[11px] text-neutral-400">
                  Drag handles or arrows to reorder steps
                </span>
              )}
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={subtaskInput}
                onChange={e => setSubtaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add intermediate milestone..."
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Add Step
              </button>
            </div>

            {/* Subtask list with visual reordering */}
            {subtasks.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
                {subtasks.map((st, i) => (
                  <li
                    key={i}
                    draggable
                    onDragStart={() => setDraggedSubtaskIdx(i)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (draggedSubtaskIdx !== null && draggedSubtaskIdx !== i) {
                        handleMoveSubtask(draggedSubtaskIdx, i);
                        setDraggedSubtaskIdx(null);
                      }
                    }}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50 transition-colors ${
                      draggedSubtaskIdx === i ? 'opacity-40 border-dashed border-neutral-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-neutral-400">
                        {i + 1}.
                      </span>
                      <span className="truncate">{st}</span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => handleMoveSubtask(i, i - 1)}
                        className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30"
                        title="Move step up"
                        aria-label="Move step up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={i === subtasks.length - 1}
                        onClick={() => handleMoveSubtask(i, i + 1)}
                        className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30"
                        title="Move step down"
                        aria-label="Move step down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(i)}
                        className="rounded p-1 text-neutral-400 hover:text-rose-500"
                        title="Delete step"
                        aria-label="Delete step"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Prerequisite Dependencies */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-800/40">
            <div className="flex items-center justify-between">
              <label htmlFor="task-dependency-select" className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                <Link2 className="h-3.5 w-3.5 text-neutral-500" />
                Prerequisite Tasks (Dependencies)
              </label>
              <span className="font-mono tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                {dependencyIds.length} linked
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Tasks that must be completed before this task can be marked done. Prevents premature completion.
            </p>

            {/* Dropdown to link a prerequisite task */}
            {candidateTasks.length > 0 ? (
              <div className="mt-2 flex gap-2">
                <select
                  id="task-dependency-select"
                  value={selectedDepToAdd}
                  onChange={e => setSelectedDepToAdd(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
                >
                  <option value="">-- Choose prerequisite task to link --</option>
                  {candidateTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.completed ? '(Completed)' : '(Active)'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedDepToAdd}
                  onClick={() => {
                    if (selectedDepToAdd && !dependencyIds.includes(selectedDepToAdd)) {
                      setDependencyIds(prev => [...prev, selectedDepToAdd]);
                      setSelectedDepToAdd('');
                    }
                  }}
                  className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-200 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Link
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-neutral-400 italic">No other available tasks to link as prerequisites.</p>
            )}

            {/* Currently linked dependencies list */}
            {dependencyIds.length > 0 && (
              <ul className="mt-2.5 space-y-1.5 border-t border-neutral-200/60 pt-2.5 dark:border-neutral-800">
                {dependencyIds.map(depId => {
                  const depItem = availableTasks.find(t => t.id === depId);
                  const isCompleted = depItem?.completed ?? false;
                  return (
                    <li
                      key={depId}
                      className="flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          }`}
                          title={isCompleted ? 'Prerequisite completed' : 'Prerequisite still active'}
                        />
                        <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                          {depItem?.title || depId}
                        </span>
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          {isCompleted ? '· Met' : '· Unresolved'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDependencyIds(prev => prev.filter(id => id !== depId))}
                        className="rounded p-1 text-neutral-400 hover:text-rose-500 transition-colors"
                        title="Unlink prerequisite"
                        aria-label="Unlink prerequisite"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Custom Tags (Classification) */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-800/40">
            <div className="flex items-center justify-between">
              <label htmlFor="task-tags-input" className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                <Tag className="h-3.5 w-3.5 text-neutral-500" />
                Custom Tags (Classification)
              </label>
              <span className="font-mono tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                {tags.length}/10 tags
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Add custom tags for quick filtering and classification. Press Enter or comma to add.
            </p>

            {/* Tag Input Field, Color Selector & Add Button */}
            <div className="mt-2 flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs select-none">
                  #
                </span>
                <input
                  id="task-tags-input"
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value.slice(0, 30))}
                  onKeyDown={handleTagKeyDown}
                  disabled={tags.length >= 10}
                  placeholder={tags.length >= 10 ? 'Maximum 10 tags reached' : 'Type custom tag (e.g. q4 release, devops)...'}
                  className="w-full rounded-lg border border-neutral-300 bg-white pl-6 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden disabled:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100 dark:disabled:bg-neutral-900"
                />
              </div>

              {/* Pill Color Accent Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" title="Select tag pill color">
                <button
                  type="button"
                  onClick={() => setSelectedTagColor('auto')}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                    selectedTagColor === 'auto'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                  title="Auto-assign tag color"
                >
                  Auto
                </button>
                {TAG_COLOR_OPTIONS.slice(0, 6).map(colorKey => {
                  const style = TAG_COLOR_STYLES[colorKey];
                  const isChosen = selectedTagColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setSelectedTagColor(colorKey)}
                      className={`h-3.5 w-3.5 rounded-full transition-transform ${style.dotClass} ${
                        isChosen ? 'ring-2 ring-offset-1 ring-neutral-900 dark:ring-neutral-100 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={`Tag color: ${style.label}`}
                      aria-label={`Select ${style.label} tag color`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleAddTag()}
                disabled={!tagInput.trim() || tags.length >= 10}
                className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-200 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Added Custom Tags List rendered as small colored pills */}
            {tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-neutral-200/60 pt-2.5 dark:border-neutral-800">
                {tags.map(tag => {
                  const tagStyle = getTagStyle(tag, tagColors);
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${tagStyle.pillClass}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCycleTagColor(tag)}
                        className={`h-2 w-2 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-125 ${tagStyle.dotClass}`}
                        title="Click to cycle pill color"
                        aria-label={`Change color for tag ${tag}`}
                      />
                      <span className="font-mono text-[11px]">#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-0.5 rounded-full p-0.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title={`Remove tag ${tag}`}
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Quick Suggestions from existing tasks */}
            {tags.length < 10 && availableTagSuggestions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px]">Quick add:</span>
                {availableTagSuggestions.map(suggestion => {
                  const sStyle = getTagStyle(suggestion, tagColors);
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleAddTag(suggestion)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] transition-all cursor-pointer ${sStyle.pillClass}`}
                      title={`Add tag #${suggestion}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sStyle.dotClass}`} />
                      <span>+{suggestion}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200 transition-colors"
            >
              {initialTodo ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
