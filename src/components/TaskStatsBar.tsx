import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Flame } from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    completed: number;
    active: number;
    dueToday: number;
    urgent: number;
    overdue: number;
    completionRate: number;
    remainingMinutes: number;
  };
  onFilterUrgent: () => void;
  onFilterToday: () => void;
  onFilterCompleted: () => void;
}

export const TaskStatsBar: React.FC<StatsProps> = ({
  stats,
  onFilterUrgent,
  onFilterToday,
  onFilterCompleted,
}) => {
  const hours = Math.floor(stats.remainingMinutes / 60);
  const mins = stats.remainingMinutes % 60;
  const timeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="w-full border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60 transition-colors">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 gap-x-6 text-xs sm:text-sm">
        {/* Progress Metric */}
        <div className="flex items-center gap-3 min-w-[200px] flex-1">
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Completion</span>
            <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">
              {stats.completionRate}%
            </span>
          </div>

          <div className="h-2 w-28 sm:w-36 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>

          <span className="text-xs text-neutral-400 font-mono tabular-nums">
            {stats.completed}/{stats.total}
          </span>
        </div>

        {/* Actionable Counters */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
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
            className="hidden sm:inline-block text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Finished: <span className="font-mono tabular-nums">{stats.completed}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
