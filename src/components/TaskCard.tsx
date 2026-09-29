import React, { useState } from 'react';
import {
  Check,
  Calendar,
  Clock,
  MoreVertical,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { TodoItem, Priority } from '../types/todo';

interface TaskCardProps {
  todo: TodoItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onEdit: (todo: TodoItem) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (todoId: string, subtaskId: string) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onDeleteSubtask: (todoId: string, subtaskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  todo,
  isSelected,
  onToggleSelect,
  onToggleComplete,
  onEdit,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  // Priority color accents
  const priorityAccents: Record<Priority, { label: string; textClass: string; dotClass: string }> = {
    urgent: { label: 'Urgent', textClass: 'text-rose-600 dark:text-rose-400 font-semibold', dotClass: 'bg-rose-500' },
    high: { label: 'High', textClass: 'text-amber-600 dark:text-amber-400 font-medium', dotClass: 'bg-amber-500' },
    medium: { label: 'Medium', textClass: 'text-sky-600 dark:text-sky-400', dotClass: 'bg-sky-500' },
    low: { label: 'Low', textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400' },
  };

  const priorityInfo = priorityAccents[todo.priority] || priorityAccents.medium;

  // Format Due Date relative or readable
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dateStr === today) return 'Due today';
    if (dateStr === tomorrow) return 'Due tomorrow';
    if (dateStr === yesterday) return 'Overdue (yesterday)';
    if (dateStr < today) return `Overdue (${dateStr})`;

    // Format readable month/day
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } catch {
      return `Due ${dateStr}`;
    }
  };

  const dueLabel = formatDueDate(todo.dueDate);
  const isOverdue = todo.dueDate && !todo.completed && todo.dueDate < new Date().toISOString().split('T')[0];

  const completedSubtasks = todo.subtasks.filter(st => st.completed).length;
  const totalSubtasks = todo.subtasks.length;

  const handleSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      onAddSubtask(todo.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setShowSubtaskInput(false);
    }
  };

  return (
    <div
      className={`group relative rounded-lg border transition-all duration-150 ${
        isSelected
          ? 'border-neutral-900 bg-neutral-50/80 dark:border-neutral-100 dark:bg-neutral-900/60 shadow-xs'
          : todo.completed
          ? 'border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800/80 dark:bg-neutral-950/40 opacity-75'
          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700'
      }`}
    >
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        {/* Bulk Selection Checkbox */}
        <div className="flex items-center pt-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(todo.id)}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-neutral-100 cursor-pointer"
            aria-label="Select task"
          />
        </div>

        {/* Task Completion Toggle Button */}
        <button
          onClick={() => onToggleComplete(todo.id)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors mt-0.5 ${
            todo.completed
              ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
              : 'border-neutral-300 hover:border-neutral-500 dark:border-neutral-600 dark:hover:border-neutral-400'
          }`}
          aria-label={todo.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
        >
          {todo.completed && <Check className="h-3 w-3 stroke-[3]" />}
        </button>

        {/* Task Main Content */}
        <div className="min-w-0 flex-1">
          {/* Title & Priority */}
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-sm font-medium leading-snug break-words ${
                todo.completed
                  ? 'line-through text-neutral-400 dark:text-neutral-500'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {todo.title}
            </h3>

            {/* Actions for Task (Always accessible on hover or focus) */}
            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => onEdit(todo)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                title="Edit task"
                aria-label="Edit task"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(todo.id)}
                className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {todo.description && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
              {todo.description}
            </p>
          )}

          {/* Unboxed Metadata Discipline with Typographic Separator (·) */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            {/* Category */}
            <span className="capitalize font-medium text-neutral-700 dark:text-neutral-300">
              {todo.category}
            </span>

            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>

            {/* Priority */}
            <span className={`inline-flex items-center gap-1 ${priorityInfo.textClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priorityInfo.dotClass}`} />
              {priorityInfo.label}
            </span>

            {/* Due Date */}
            {dueLabel && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-medium' : ''}`}>
                  <Calendar className="h-3 w-3" />
                  <span>{dueLabel}</span>
                </span>
              </>
            )}

            {/* Estimated time */}
            {todo.estimatedMinutes && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Clock className="h-3 w-3" />
                  <span>{todo.estimatedMinutes}m</span>
                </span>
              </>
            )}

            {/* Subtasks Count / Expand trigger */}
            {totalSubtasks > 0 && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-mono tabular-nums"
                >
                  <ListTodo className="h-3 w-3" />
                  <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              </>
            )}

            {/* Tags if any */}
            {todo.tags.length > 0 && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="text-neutral-400">
                  {todo.tags.map(t => `#${t}`).join(' ')}
                </span>
              </>
            )}
          </div>

          {/* Subtasks Checklist Drawer */}
          {(isExpanded || totalSubtasks > 0 && !todo.completed && totalSubtasks <= 2) && (
            <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/60 space-y-1.5">
              {todo.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center justify-between group/sub py-0.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => onToggleSubtask(todo.id, sub.id)}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <span className={sub.completed ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-300'}>
                      {sub.title}
                    </span>
                  </label>
                  <button
                    onClick={() => onDeleteSubtask(todo.id, sub.id)}
                    className="opacity-0 group-hover/sub:opacity-100 text-neutral-400 hover:text-rose-500 p-0.5"
                    title="Remove subtask"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add subtask inline */}
              {showSubtaskInput ? (
                <form onSubmit={handleSubtaskSubmit} className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    placeholder="Enter subtask title..."
                    autoFocus
                    className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 focus:outline-hidden focus:border-neutral-900"
                  />
                  <button
                    type="submit"
                    className="rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubtaskInput(false)}
                    className="rounded px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubtaskInput(true)}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 pt-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add checklist step</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
