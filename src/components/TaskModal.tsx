import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Calendar, Clock, Tag } from 'lucide-react';
import { TodoItem, Priority, Category } from '../types/todo';
import { sanitizeString } from '../utils/security';

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
  }) => void;
  initialTodo?: TodoItem | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTodo,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('work');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Populate form if editing
  useEffect(() => {
    if (initialTodo) {
      setTitle(initialTodo.title || '');
      setDescription(initialTodo.description || '');
      setPriority(initialTodo.priority || 'medium');
      setCategory(initialTodo.category || 'work');
      setDueDate(initialTodo.dueDate || '');
      setEstimatedMinutes(initialTodo.estimatedMinutes || '');
      setSubtasks(initialTodo.subtasks ? initialTodo.subtasks.map(s => s.title) : []);
      setTagInput(initialTodo.tags ? initialTodo.tags.join(', ') : '');
    } else {
      // Defaults for new task
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('work');
      setDueDate(new Date().toISOString().split('T')[0]);
      setEstimatedMinutes(30);
      setSubtasks([]);
      setTagInput('');
    }
  }, [initialTodo, isOpen]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeString(title, 200);
    if (!cleanTitle) return;

    const tags = tagInput
      .split(',')
      .map(t => sanitizeString(t.trim(), 30).toLowerCase())
      .filter(Boolean);

    onSubmit({
      title: cleanTitle,
      description: description ? sanitizeString(description, 1000) : undefined,
      priority,
      category,
      dueDate: dueDate || undefined,
      estimatedMinutes: typeof estimatedMinutes === 'number' && estimatedMinutes > 0 ? estimatedMinutes : undefined,
      subtasks,
      tags,
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

          {/* Two-column Row: Due Date & Estimated Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label htmlFor="task-duration" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Estimated Focus Time (mins)
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

          {/* Subtasks Builder */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Checklist Steps / Subtasks
            </label>
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

            {/* Subtask list */}
            {subtasks.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
                {subtasks.map((st, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300">
                    <span className="truncate pr-2">• {st}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(i)}
                      className="text-neutral-400 hover:text-rose-500 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="task-tags" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Tags (comma separated)
            </label>
            <input
              id="task-tags"
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="e.g. devops, audit, client"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
            />
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
