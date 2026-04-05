import type { RouteDefinition } from '../lib/types';

export const ROUTES: readonly RouteDefinition[] = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Talk to Hermes and watch tool activity.',
    headline: 'Chat with Hermes',
    summary: 'Streaming chat, tool events, approvals, and session-aware interaction will live here.'
  },
  {
    id: 'sessions',
    label: 'Sessions',
    description: 'Browse, inspect, and resume past work.',
    headline: 'Session browser',
    summary: 'Searchable history, transcript previews, exports, and resume actions belong on this page.'
  },
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Inspect files, diffs, and processes.',
    headline: 'Workspace operations',
    summary: 'File trees, patches, checkpoints, rollback, and process logs will be surfaced here.'
  },
  {
    id: 'usage',
    label: 'Usage',
    description: 'Analytics, token usage, and costs.',
    headline: 'Usage Insights',
    summary: 'Track your Hermes API usage.'
  },
  {
    id: 'jobs',
    label: 'Background Jobs',
    description: 'Track background agents.',
    headline: 'Background Jobs',
    summary: 'Monitor status of dispatched background agents.'
  },
  {
    id: 'skills',
    label: 'Skills',
    description: 'Browse, install, and manage skills.',
    headline: 'Skills Hub',
    summary: 'Enhance your agent with official and community skills or create your own.'
  }
] as const;

export const PRIMARY_NAV_ITEMS = ROUTES.map((item) => item.label);
