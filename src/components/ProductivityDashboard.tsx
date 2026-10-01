import React from 'react';
import { TodoItem, Category, Priority } from '../types/todo';
import { CheckCircle2, Clock, BarChart3, Target, Calendar } from 'lucide-react';

interface ProductivityDashboardProps {
  todos: TodoItem[];
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({ todos }) => {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const archived = todos.filter(t => Boolean(t.archived)).length;
  const active = todos.filter(t => !t.completed && !t.archived).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Category breakdown
  const categories: Category[] = ['work', 'personal', 'finance', 'health', 'learning', 'errands'];
  const categoryStats = categories.map(cat => {
    const inCat = todos.filter(t => t.category === cat);
    const catDone = inCat.filter(t => t.completed).length;
    return {
      category: cat,
      total: inCat.length,
      completed: catDone,
      rate: inCat.length > 0 ? Math.round((catDone / inCat.length) * 100) : 0,
    };
  }).filter(c => c.total > 0);

  // Priority breakdown
  const priorities: Priority[] = ['urgent', 'high', 'medium', 'low'];
  const priorityStats = priorities.map(pri => {
    const inPri = todos.filter(t => t.priority === pri);
    const priDone = inPri.filter(t => t.completed).length;
    return {
      priority: pri,
      total: inPri.length,
      completed: priDone,
    };
  });

  // Total estimated hours
  const totalMinutes = todos.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
  const completedMinutes = todos.filter(t => t.completed).reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Overall Completion</span>
            <Target className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {completionRate}%
          </div>
          <p className="mt-1 text-xs text-neutral-400 font-mono tabular-nums">
            {completed} of {total} completed{archived > 0 ? ` · ${archived} archived` : ''}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Active Pipeline</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {active}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Pending user execution
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Focus Time Logged</span>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {(completedMinutes / 60).toFixed(1)}h
          </div>
          <p className="mt-1 text-xs text-neutral-400 font-mono tabular-nums">
            of {(totalMinutes / 60).toFixed(1)}h planned effort
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span>Urgent Queue</span>
            <BarChart3 className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
            {todos.filter(t => !t.completed && t.priority === 'urgent').length}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            High-leverage blockers
          </p>
        </div>
      </div>

      {/* Two Column Grid: Category Breakdown + Priority Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800">
            Category Breakdown
          </h3>
          <div className="mt-4 space-y-3.5">
            {categoryStats.map(item => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize font-medium text-neutral-700 dark:text-neutral-300">
                    {item.category}
                  </span>
                  <span className="font-mono tabular-nums text-neutral-500">
                    {item.completed}/{item.total} ({item.rate}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300"
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800">
            Priority Distribution
          </h3>
          <div className="mt-4 space-y-3">
            {priorityStats.map(p => {
              const colors: Record<Priority, string> = {
                urgent: 'bg-rose-500',
                high: 'bg-amber-500',
                medium: 'bg-sky-500',
                low: 'bg-neutral-400',
              };
              const percentage = total > 0 ? Math.round((p.total / total) * 100) : 0;
              return (
                <div key={p.priority} className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${colors[p.priority]}`} />
                    <span className="capitalize font-medium text-neutral-800 dark:text-neutral-200">
                      {p.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums text-neutral-500">
                    <span>{p.total} tasks</span>
                    <span className="text-neutral-400 w-10 text-right">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
