import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Flame, Archive, Target, Minus, Plus, Check } from 'lucide-react';
import { loadDailyGoal, saveDailyGoal } from '../utils/storage';

interface StatsProps {
  stats: {
    total: number;
    completed: number;
    completedToday?: number;
    dailyGoal?: number;
    dailyGoalProgress?: number;
    dailyGoalMet?: boolean;
    archived?: number;
    completedUnarchived?: number;
    active: number;
    dueToday: number;
    urgent: number;
    overdue: number;
    completionRate: number;
    remainingMinutes: number;
  };
  dailyGoal?: number;
  onUpdateDailyGoal?: (goal: number) => void;
  onFilterUrgent: () => void;
  onFilterToday: () => void;
  onFilterCompleted: () => void;
  onFilterArchived?: () => void;
}

export const TaskStatsBar: React.FC<StatsProps> = ({
  stats,
  dailyGoal: propDailyGoal,
  onUpdateDailyGoal,
  onFilterUrgent,
  onFilterToday,
  onFilterCompleted,
  onFilterArchived,
}) => {
  const [localGoal, setLocalGoal] = useState<number>(() => loadDailyGoal());
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState<string>('');

  const targetGoal = propDailyGoal ?? stats.dailyGoal ?? localGoal;
  const completedToday = stats.completedToday ?? stats.completed;
  const dailyGoalProgress =
    stats.dailyGoalProgress ??
    (targetGoal > 0 ? Math.min(100, Math.round((completedToday / targetGoal) * 100)) : 0);
  const isGoalMet = stats.dailyGoalMet ?? (targetGoal > 0 && completedToday >= targetGoal);

  useEffect(() => {
    setGoalInput(String(targetGoal));
  }, [targetGoal]);

  const applyGoalChange = (nextVal: number) => {
    const clamped = Math.max(1, Math.min(50, Math.round(nextVal)));
    const persisted = saveDailyGoal(clamped);
    setLocalGoal(persisted);
    if (onUpdateDailyGoal) {
      onUpdateDailyGoal(persisted);
    }
  };

  const handleGoalFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(goalInput, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      applyGoalChange(parsed);
    } else {
      setGoalInput(String(targetGoal));
    }
    setIsEditingGoal(false);
  };

  const hours = Math.floor(stats.remainingMinutes / 60);
  const mins = stats.remainingMinutes % 60;
  const timeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="w-full border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60 transition-colors">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 gap-x-6 text-xs sm:text-sm">
        {/* Left: Progress Metrics (Overall Completion + Daily Goal) */}
        <div className="flex flex-wrap items-center gap-y-2.5 gap-x-6 flex-1">
          {/* Overall Completion Metric */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">Completion</span>
              <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">
                {stats.completionRate}%
              </span>
            </div>

            <div
              className="h-2 w-24 sm:w-28 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={stats.completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall task completion progress"
            >
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>

            <span className="text-xs text-neutral-400 font-mono tabular-nums">
              {stats.completed}/{stats.total}
            </span>
          </div>

          <span aria-hidden="true" className="hidden sm:inline text-neutral-300 dark:text-neutral-700">
            ·
          </span>

          {/* Visual Daily Goal Progress Indicator */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <Target
                className={`h-4 w-4 shrink-0 ${
                  isGoalMet
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              />
              <span className="font-medium">Daily Goal</span>
              <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">
                {dailyGoalProgress}%
              </span>
            </div>

            <div
              className="h-2 w-24 sm:w-28 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={dailyGoalProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Daily goal completion progress"
            >
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  isGoalMet
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-indigo-600 dark:bg-indigo-500'
                }`}
                style={{ width: `${dailyGoalProgress}%` }}
              />
            </div>

            {/* Interactive Daily Goal Target Control */}
            {isEditingGoal ? (
              <form onSubmit={handleGoalFormSubmit} className="inline-flex items-center gap-1">
                <label htmlFor="daily-goal-target-input" className="sr-only">
                  Daily goal target tasks
                </label>
                <input
                  id="daily-goal-target-input"
                  type="number"
                  min={1}
                  max={50}
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setGoalInput(String(targetGoal));
                      setIsEditingGoal(false);
                    }
                  }}
                  autoFocus
                  className="w-12 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-center font-mono text-xs tabular-nums text-neutral-900 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-100"
                />
                <button
                  type="submit"
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-neutral-200 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
                  title="Save daily goal target"
                  aria-label="Save daily goal target"
                >
                  <Check className="h-3 w-3" />
                </button>
              </form>
            ) : (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyGoalChange(targetGoal - 1)}
                  disabled={targetGoal <= 1}
                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 disabled:pointer-events-none dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
                  title="Decrease daily goal target"
                  aria-label="Decrease daily goal target"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGoalInput(String(targetGoal));
                    setIsEditingGoal(true);
                  }}
                  className="px-1 font-mono text-xs tabular-nums text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white underline decoration-dotted underline-offset-2 transition-colors"
                  title="Click to set custom daily goal target"
                  aria-label={`Daily goal: ${completedToday} of ${targetGoal} tasks completed today. Click to edit target.`}
                >
                  {completedToday}/{targetGoal} today
                </button>

                <button
                  type="button"
                  onClick={() => applyGoalChange(targetGoal + 1)}
                  disabled={targetGoal >= 50}
                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 disabled:pointer-events-none dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
                  title="Increase daily goal target"
                  aria-label="Increase daily goal target"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>

                {isGoalMet && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    · Goal Met
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actionable Counters */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-xs">
          {/* Due Today */}
          <button
            onClick={onFilterToday}
            className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span>Today:</span>
            <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.dueToday}
            </span>
          </button>

          {/* Urgent Items */}
          <button
            onClick={onFilterUrgent}
            className={`flex items-center gap-1.5 transition-colors ${
              stats.urgent > 0
                ? 'text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Flame className={`h-3.5 w-3.5 ${stats.urgent > 0 ? 'text-rose-500' : 'text-neutral-400'}`} />
            <span>Urgent:</span>
            <span className="font-mono tabular-nums font-semibold">
              {stats.urgent}
            </span>
          </button>

          {/* Overdue Alert */}
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Overdue:</span>
              <span className="font-mono tabular-nums font-semibold">
                {stats.overdue}
              </span>
            </div>
          )}

          {/* Estimated Focus Time */}
          {stats.remainingMinutes > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <span>Focus required:</span>
              <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                {timeFormatted}
              </span>
            </div>
          )}

          {/* Completed Button */}
          <button
            onClick={onFilterCompleted}
            className="hidden sm:inline-block text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
          >
            Finished: <span className="font-mono tabular-nums">{stats.completed}</span>
          </button>

          {/* Archived Counter */}
          {onFilterArchived && (
            <button
              onClick={onFilterArchived}
              className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              title="View archived tasks"
            >
              <Archive className="h-3.5 w-3.5 text-neutral-400" />
              <span>Archived:</span>
              <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                {stats.archived ?? 0}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
