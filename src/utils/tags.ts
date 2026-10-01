import { TagColor } from '../types/todo';

export const TAG_COLOR_OPTIONS: TagColor[] = [
  'emerald',
  'sky',
  'violet',
  'amber',
  'rose',
  'indigo',
  'teal',
  'fuchsia',
];

export interface TagColorStyle {
  color: TagColor;
  label: string;
  pillClass: string;
  activePillClass: string;
  dotClass: string;
}

export const TAG_COLOR_STYLES: Record<TagColor, TagColorStyle> = {
  emerald: {
    color: 'emerald',
    label: 'Emerald',
    pillClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70 dark:hover:bg-emerald-900/60',
    activePillClass:
      'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:text-neutral-950 dark:border-emerald-500',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
  },
  sky: {
    color: 'sky',
    label: 'Sky',
    pillClass:
      'bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70 dark:hover:bg-sky-900/60',
    activePillClass:
      'bg-sky-600 text-white border-sky-600 dark:bg-sky-500 dark:text-neutral-950 dark:border-sky-500',
    dotClass: 'bg-sky-500 dark:bg-sky-400',
  },
  violet: {
    color: 'violet',
    label: 'Violet',
    pillClass:
      'bg-violet-50 text-violet-700 border-violet-200/90 hover:bg-violet-100/80 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/70 dark:hover:bg-violet-900/60',
    activePillClass:
      'bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:text-neutral-950 dark:border-violet-500',
    dotClass: 'bg-violet-500 dark:bg-violet-400',
  },
  amber: {
    color: 'amber',
    label: 'Amber',
    pillClass:
      'bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70 dark:hover:bg-amber-900/60',
    activePillClass:
      'bg-amber-500 text-neutral-950 border-amber-500 dark:bg-amber-400 dark:text-neutral-950 dark:border-amber-400',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
  },
  rose: {
    color: 'rose',
    label: 'Rose',
    pillClass:
      'bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70 dark:hover:bg-rose-900/60',
    activePillClass:
      'bg-rose-600 text-white border-rose-600 dark:bg-rose-500 dark:text-white dark:border-rose-500',
    dotClass: 'bg-rose-500 dark:bg-rose-400',
  },
  indigo: {
    color: 'indigo',
    label: 'Indigo',
    pillClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/70 dark:hover:bg-indigo-900/60',
    activePillClass:
      'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:text-white dark:border-indigo-500',
    dotClass: 'bg-indigo-500 dark:bg-indigo-400',
  },
  teal: {
    color: 'teal',
    label: 'Teal',
    pillClass:
      'bg-teal-50 text-teal-700 border-teal-200/90 hover:bg-teal-100/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/70 dark:hover:bg-teal-900/60',
    activePillClass:
      'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:text-neutral-950 dark:border-teal-500',
    dotClass: 'bg-teal-500 dark:bg-teal-400',
  },
  fuchsia: {
    color: 'fuchsia',
    label: 'Fuchsia',
    pillClass:
      'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/90 hover:bg-fuchsia-100/80 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:border-fuchsia-800/70 dark:hover:bg-fuchsia-900/60',
    activePillClass:
      'bg-fuchsia-600 text-white border-fuchsia-600 dark:bg-fuchsia-500 dark:text-white dark:border-fuchsia-500',
    dotClass: 'bg-fuchsia-500 dark:bg-fuchsia-400',
  },
};

const KNOWN_TAG_DEFAULTS: Record<string, TagColor> = {
  devops: 'indigo',
  security: 'rose',
  finance: 'emerald',
  reporting: 'amber',
  health: 'teal',
  routine: 'sky',
  reading: 'violet',
  architecture: 'fuchsia',
  frontend: 'sky',
  backend: 'indigo',
  urgent: 'rose',
  audit: 'amber',
  client: 'emerald',
  feature: 'violet',
};

export function resolveTagColor(
  tag: string,
  tagColors?: Record<string, TagColor>
): TagColor {
  const normalized = tag.trim().toLowerCase();
  if (tagColors && tagColors[normalized] && TAG_COLOR_STYLES[tagColors[normalized]]) {
    return tagColors[normalized];
  }
  if (KNOWN_TAG_DEFAULTS[normalized]) {
    return KNOWN_TAG_DEFAULTS[normalized];
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return TAG_COLOR_OPTIONS[hash % TAG_COLOR_OPTIONS.length];
}

export function getTagStyle(
  tag: string,
  tagColors?: Record<string, TagColor>
): TagColorStyle {
  const color = resolveTagColor(tag, tagColors);
  return TAG_COLOR_STYLES[color];
}
