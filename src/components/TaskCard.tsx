import React, { useState, useMemo } from 'react';
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
  ChevronUp,
  ListTodo,
  GripVertical,
  Lock,
  Link2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { TodoItem, Priority } from '../types/todo';

interface TaskCardProps {
  todo: TodoItem;
  rankNumber: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onEdit: (todo: TodoItem) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (todoId: string, subtaskId: string) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onDeleteSubtask: (todoId: string, subtaskId: string) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  onMoveNudge?: (id: string, direction: 'up' | 'down') => void;
  isDragOver?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  allTodos?: TodoItem[];
  onNavigateToTask?: (id: string) => void;
  onFilterByTag?: (tag: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  todo,
  rankNumber,
  isSelected,
  onToggleSelect,
  onToggleComplete,
  onArchive,
  onUnarchive,
  onEdit,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveNudge,
  isDragOver = false,
  canMoveUp = false,
  canMoveDown = false,
  allTodos = [],
  onNavigateToTask,
  onFilterByTag,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  // Compute dependency resolution status
  const depIds = todo.dependencyIds || [];
  const todoMap = useMemo(() => new Map(allTodos.map(t => [t.id, t])), [allTodos]);
  const activeDependencies = useMemo(() => {
    return depIds.map(id => todoMap.get(id)).filter((t): t is TodoItem => Boolean(t && !t.completed));
  }, [depIds, todoMap]);
  const completedDependencies = useMemo(() => {
    return depIds.map(id => todoMap.get(id)).filter((t): t is TodoItem => Boolean(t && t.completed));
  }, [depIds, todoMap]);
  const isBlocked = activeDependencies.length > 0;

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
      id={`task-card-${todo.id}`}
      draggable
      onDragStart={e => onDragStart && onDragStart(e, todo.id)}
      onDragOver={e => onDragOver && onDragOver(e, todo.id)}
      onDragLeave={e => onDragLeave && onDragLeave(e)}
      onDrop={e => onDrop && onDrop(e, todo.id)}
      className={`group relative rounded-lg border transition-all duration-150 ${
        isDragOver
          ? 'border-t-2 border-t-neutral-900 dark:border-t-neutral-100 bg-neutral-100/60 dark:bg-neutral-800/60 shadow-md'
          : isSelected
          ? 'border-neutral-900 bg-neutral-50/80 dark:border-neutral-100 dark:bg-neutral-900/60 shadow-xs'
          : todo.completed
          ? 'border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800/80 dark:bg-neutral-950/40 opacity-75'
          : isBlocked
          ? 'border-neutral-200 border-l-[3px] border-l-amber-500 bg-white dark:border-neutral-800 dark:border-l-amber-500 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700'
          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700'
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4">
        {/* Drag Handle & Priority Rank Numerical Badge */}
        <div className="flex flex-col items-center justify-center gap-0.5 pt-0.5 shrink-0 select-none">
          <div
            className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            title="Drag to reorder priority in queue"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          {/* Unboxed Tabular Priority Rank Number */}
          <span
            className="font-mono tabular-nums text-[10px] font-semibold text-neutral-400 dark:text-neutral-500"
            title={`Priority Queue Rank #${rankNumber}`}
          >
            #{rankNumber}
          </span>
          {/* Quick Nudge Buttons (Accessible on hover/focus) */}
          {onMoveNudge && (canMoveUp || canMoveDown) && (
            <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity -mt-0.5">
              {canMoveUp && (
                <button
                  type="button"
                  onClick={() => onMoveNudge(todo.id, 'up')}
                  className="rounded p-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  title="Move priority up"
                  aria-label="Move priority up"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
              )}
              {canMoveDown && (
                <button
                  type="button"
                  onClick={() => onMoveNudge(todo.id, 'down')}
                  className="rounded p-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  title="Move priority down"
                  aria-label="Move priority down"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

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

        {/* Task Completion Toggle Button (Locked if dependencies are active) */}
        {isBlocked && !todo.completed ? (
          <button
            onClick={() => onToggleComplete(todo.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-400 bg-amber-50/80 text-amber-600 hover:bg-amber-100 hover:border-amber-500 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors mt-0.5 cursor-pointer shadow-2xs"
            title={`Completion locked: Prerequisite "${activeDependencies[0]?.title}" is still active`}
            aria-label={`Task completion locked: waiting on ${activeDependencies.length} prerequisite`}
          >
            <Lock className="h-2.5 w-2.5 stroke-[2.5]" />
          </button>
        ) : (
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
        )}

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
              {todo.completed && !todo.archived && onArchive && (
                <button
                  onClick={() => onArchive(todo.id)}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Move completed task to Archive"
                  aria-label="Archive task"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              )}
              {todo.archived && onUnarchive && (
                <button
                  onClick={() => onUnarchive(todo.id)}
                  className="rounded p-1 text-neutral-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                  title="Restore task from Archive to main list"
                  aria-label="Restore task from Archive"
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                </button>
              )}
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

            {/* Dependency / Prerequisite status */}
            {isBlocked && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <span
                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"
                  title={`Waiting on prerequisite tasks: ${activeDependencies.map(d => d.title).join(', ')}`}
                >
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>Blocked by:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToTask?.(activeDependencies[0].id);
                    }}
                    className="underline decoration-dotted underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300 text-left font-semibold max-w-[160px] sm:max-w-xs truncate"
                  >
                    {activeDependencies[0].title}
                    {activeDependencies.length > 1 ? ` (+${activeDependencies.length - 1})` : ''}
                  </button>
                </span>
              </>
            )}

            {!isBlocked && depIds.length > 0 && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400 font-mono tabular-nums text-xs">
                  <Link2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Prerequisites met ({completedDependencies.length}/{depIds.length})</span>
                </span>
              </>
            )}

            {/* Tags if any */}
            {todo.tags.length > 0 && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  {todo.tags.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFilterByTag) {
                          onFilterByTag(t);
                        }
                      }}
                      className="font-mono text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer hover:underline decoration-dotted underline-offset-2"
                      title={`Filter by tag #${t}`}
                      aria-label={`Filter by tag #${t}`}
                    >
                      #{t}
                    </button>
                  ))}
                </span>
              </>
            )}

            {/* Inline Archive / Restore Action for Completed Tasks */}
            {todo.completed && !todo.archived && onArchive && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <button
                  type="button"
                  onClick={() => onArchive(todo.id)}
                  className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors font-medium cursor-pointer"
                  title="Move completed task to Archive to declutter main view"
                >
                  <Archive className="h-3 w-3" />
                  <span>Move to Archive</span>
                </button>
              </>
            )}

            {todo.archived && (
              <>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                  <Archive className="h-3 w-3" />
                  <span>
                    Archived{todo.archivedAt ? ` ${todo.archivedAt.split('T')[0]}` : ''}
                  </span>
                </span>
                {onUnarchive && (
                  <>
                    <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                    <button
                      type="button"
                      onClick={() => onUnarchive(todo.id)}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                      title="Restore task to active/completed queue"
                    >
                      <ArchiveRestore className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                  </>
                )}
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
