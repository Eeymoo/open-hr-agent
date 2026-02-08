export const PRIORITY_LEVELS = {
  CRITICAL: 100,
  HIGH: 80,
  MEDIUM_HIGH: 60,
  MEDIUM: 50,
  MEDIUM_LOW: 40,
  LOW: 30,
  VERY_LOW: 20,
  MINIMAL: 10,
  NONE: 0
} as const;

export const LABEL_TO_PRIORITY: Record<string, number> = {
  critical: PRIORITY_LEVELS.CRITICAL,
  high: PRIORITY_LEVELS.HIGH,
  'medium-high': PRIORITY_LEVELS.MEDIUM_HIGH,
  medium: PRIORITY_LEVELS.MEDIUM,
  'medium-low': PRIORITY_LEVELS.MEDIUM_LOW,
  low: PRIORITY_LEVELS.LOW,
  'very-low': PRIORITY_LEVELS.VERY_LOW,
  minimal: PRIORITY_LEVELS.MINIMAL
} as const;

export function getPriorityFromLabels(labels: { name?: string }[] | undefined): number {
  if (!labels || labels.length === 0) {
    return PRIORITY_LEVELS.MEDIUM;
  }

  const labelNames = labels
    .map((l) => l.name?.toLowerCase())
    .filter((label): label is string => Boolean(label));

  for (const label of labelNames) {
    const priority = LABEL_TO_PRIORITY[label];
    if (priority !== undefined) {
      return priority;
    }
  }

  return PRIORITY_LEVELS.MEDIUM;
}
