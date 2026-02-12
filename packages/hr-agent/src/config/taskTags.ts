export const TASK_TAGS = {
  REQUIRES_CA: 'requires:ca',
  MANAGES_CA: 'manages:ca',
  AGENT_CODING: 'agent:coding',
  AGENT_REVIEW: 'agent:review',
  AGENT_TEST: 'agent:test',
  LONG_RUNNING: 'runtime:long'
} as const;

export type TaskTag = (typeof TASK_TAGS)[keyof typeof TASK_TAGS];

export const hasTag = (tags: string[], tag: string): boolean => tags.includes(tag);

export const hasRequiresCATag = (tags: string[]): boolean => hasTag(tags, TASK_TAGS.REQUIRES_CA);
