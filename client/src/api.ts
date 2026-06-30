import type { Resource, WorkItem } from './types';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkItemPageParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'all' | 'open' | 'assigned';
  priority?: string;
  skill?: string;
  sort?: 'priority' | 'date' | 'name' | 'duration';
}

export interface ResourcePageParams {
  page: number;
  pageSize: number;
  search?: string;
  discipline?: 'all' | 'Engineer' | 'Data scientist';
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'all') {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchWorkItems(params: WorkItemPageParams): Promise<Page<WorkItem>> {
  const response = await fetch(`/api/work-items${buildQuery({ ...params })}`);
  if (!response.ok) {
    throw new Error('Could not load work items.');
  }
  return (await response.json()) as Page<WorkItem>;
}

export async function fetchResources(params: ResourcePageParams): Promise<Page<Resource>> {
  const response = await fetch(`/api/resources${buildQuery({ ...params })}`);
  if (!response.ok) {
    throw new Error('Could not load resources.');
  }
  return (await response.json()) as Page<Resource>;
}
