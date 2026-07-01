import type { AppState, Booking, Priority, Resource, ResourceDiscipline, WorkItem } from './domain.js';

const initialDate = new Date().toISOString().slice(0, 10);

const formatLocalDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
};

const resourceSeeds: Resource[] = [
  {
    id: 'resource-1',
    name: 'Nina Brooks',
    discipline: 'Engineer',
    level: 'Senior',
    skills: ['ASP.NET Core', 'SQL', 'Testing'],
    color: '#1d4ed8',
    workingHours: { start: 9, end: 17 },
  },
  {
    id: 'resource-2',
    name: 'Mateo Silva',
    discipline: 'Engineer',
    level: 'Junior',
    skills: ['React', 'TypeScript', 'Accessibility'],
    color: '#7c3aed',
    workingHours: { start: 9, end: 17 },
  },
  {
    id: 'resource-3',
    name: 'Priya Desai',
    discipline: 'Engineer',
    level: 'Principal',
    skills: ['ASP.NET Core', 'React', 'Testing'],
    color: '#059669',
    workingHours: { start: 9, end: 17 },
  },
  {
    id: 'resource-4',
    name: 'Omar Haddad',
    discipline: 'Engineer',
    level: 'Manager',
    skills: ['ASP.NET Core', 'Azure', 'SQL'],
    color: '#ea580c',
    workingHours: { start: 8, end: 16 },
  },
  {
    id: 'resource-5',
    name: 'Elena Kim',
    discipline: 'Data scientist',
    level: 'Senior',
    skills: ['Testing', 'SQL', 'Product'],
    color: '#db2777',
    workingHours: { start: 9, end: 17 },
  },
  {
    id: 'resource-6',
    name: 'Lucas Reed',
    discipline: 'Engineer',
    level: 'Junior',
    skills: ['Product', 'UX', 'React'],
    color: '#0f766e',
    workingHours: { start: 9, end: 17 },
  },
  {
    id: 'resource-7',
    name: 'Sofia Ivanov',
    discipline: 'Data scientist',
    level: 'Principal',
    skills: ['SQL', 'Azure', 'Testing'],
    color: '#4f46e5',
    workingHours: { start: 10, end: 18 },
  },
  {
    id: 'resource-8',
    name: 'Aisha Rahman',
    discipline: 'Data scientist',
    level: 'Manager',
    skills: ['SQL', 'Azure', 'Product'],
    color: '#0891b2',
    workingHours: { start: 8, end: 16 },
  },
];

const assignedPlans = [
  {
    title: 'Harden health endpoints',
    description: 'Stabilize the ASP.NET Core health checks and surface clear failure details.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['ASP.NET Core', 'Testing'],
    resourceId: 'resource-1',
    startTime: '09:00:00',
  },
  {
    title: 'Tighten data access patterns',
    description: 'Reduce query noise and make the SQL layer easier to trace.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['SQL', 'Testing'],
    resourceId: 'resource-1',
    startTime: '11:00:00',
  },
  {
    title: 'Build settings panel',
    description: 'Create the React settings flow and keep form state responsive.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['React', 'TypeScript'],
    resourceId: 'resource-2',
    startTime: '09:30:00',
  },
  {
    title: 'Improve a11y focus states',
    description: 'Tune keyboard behavior so the board feels predictable.',
    priority: 'Low',
    durationMinutes: 45,
    requiredSkills: ['React', 'Accessibility'],
    resourceId: 'resource-2',
    startTime: '11:30:00',
  },
  {
    title: 'Wire auth session UX',
    description: 'Connect the React UI to the backend login state and improve the handoff flow.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['ASP.NET Core', 'React'],
    resourceId: 'resource-3',
    startTime: '10:00:00',
  },
  {
    title: 'Write end-to-end booking tests',
    description: 'Cover assignment, reassignment, and unassignment across the stack.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['Testing', 'React'],
    resourceId: 'resource-3',
    startTime: '13:00:00',
  },
  {
    title: 'Tune deployment pipeline',
    description: 'Adjust Azure deployment checks and keep the backend release path reliable.',
    priority: 'Low',
    durationMinutes: 60,
    requiredSkills: ['Azure', 'ASP.NET Core'],
    resourceId: 'resource-4',
    startTime: '08:00:00',
  },
  {
    title: 'Map API controller boundaries',
    description: 'Split the ASP.NET Core endpoints into clearer feature areas.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['ASP.NET Core'],
    resourceId: 'resource-4',
    startTime: '10:00:00',
  },
  {
    title: 'Expand regression coverage',
    description: 'Add coverage for the most important booking and edit flows.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['Testing', 'React'],
    resourceId: 'resource-5',
    startTime: '09:15:00',
  },
  {
    title: 'Shape reporting exports',
    description: 'Keep the export format easy to consume for downstream reports.',
    priority: 'Low',
    durationMinutes: 45,
    requiredSkills: ['SQL', 'Product'],
    resourceId: 'resource-5',
    startTime: '11:00:00',
  },
  {
    title: 'Refine dashboard copy',
    description: 'Make the scheduling screen copy shorter and easier to scan.',
    priority: 'Low',
    durationMinutes: 45,
    requiredSkills: ['Product', 'UX'],
    resourceId: 'resource-6',
    startTime: '09:00:00',
  },
  {
    title: 'Polish mobile layout',
    description: 'Keep the schedule board readable at narrow widths.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['React', 'Accessibility'],
    resourceId: 'resource-6',
    startTime: '13:00:00',
  },
  {
    title: 'Prepare data export job',
    description: 'Shape the SQL-backed export job and confirm it fits the reporting needs.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['SQL', 'Azure'],
    resourceId: 'resource-7',
    startTime: '10:00:00',
  },
  {
    title: 'Stabilize model training notes',
    description: 'Tighten the handoff between data checks and workflow updates.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['Azure', 'Testing'],
    resourceId: 'resource-7',
    startTime: '14:00:00',
  },
  {
    title: 'Align portfolio reporting',
    description: 'Bring the status summary into one readable view for leadership.',
    priority: 'Low',
    durationMinutes: 45,
    requiredSkills: ['Product', 'SQL'],
    resourceId: 'resource-8',
    startTime: '08:30:00',
  },
  {
    title: 'Review launch metrics',
    description: 'Validate the dashboard numbers that steer the weekly review.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['Azure', 'Product'],
    resourceId: 'resource-8',
    startTime: '13:30:00',
  },
  {
    title: 'Coordinate incident review',
    description: 'Keep the post-incident checklist moving and capture the follow-ups.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['Azure', 'Testing'],
    resourceId: 'resource-4',
    startTime: '12:30:00',
  },
  {
    title: 'Refine deployment guardrails',
    description: 'Tighten the checks around release readiness and rollback safety.',
    priority: 'Medium',
    durationMinutes: 45,
    requiredSkills: ['ASP.NET Core', 'Azure'],
    resourceId: 'resource-4',
    startTime: '14:00:00',
  },
  {
    title: 'Validate export metrics',
    description: 'Double-check the report output before the leadership review.',
    priority: 'Medium',
    durationMinutes: 45,
    requiredSkills: ['SQL', 'Product'],
    resourceId: 'resource-5',
    startTime: '14:30:00',
  },
  {
    title: 'Review anomaly thresholds',
    description: 'Tune the alert thresholds so the data pipeline stays calm.',
    priority: 'Low',
    durationMinutes: 60,
    requiredSkills: ['Azure', 'Testing'],
    resourceId: 'resource-7',
    startTime: '15:15:00',
  },
] as const;

const backlogTemplates = [
  {
    title: 'Map API controller boundaries',
    description: 'Split the ASP.NET Core endpoints into clearer feature areas.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['ASP.NET Core'],
  },
  {
    title: 'Improve drag and drop accessibility',
    description: 'Make keyboard and focus behavior more predictable across the board.',
    priority: 'Low',
    durationMinutes: 45,
    requiredSkills: ['React', 'Accessibility'],
  },
  {
    title: 'Add API state handling',
    description: 'Handle loading and error states cleanly in the React data layer.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['TypeScript', 'React'],
  },
  {
    title: 'Document service contracts',
    description: 'Write down request and response shapes for the backend.',
    priority: 'Low',
    durationMinutes: 45,
    requiredSkills: ['ASP.NET Core', 'Product'],
  },
  {
    title: 'Tune queue copy',
    description: 'Shorten the waiting list text so it scans faster.',
    priority: 'Low',
    durationMinutes: 30,
    requiredSkills: ['Product', 'UX'],
  },
  {
    title: 'Prepare rollout checklist',
    description: 'Give the release path a simple set of checks for the team.',
    priority: 'Medium',
    durationMinutes: 45,
    requiredSkills: ['Azure', 'Product'],
  },
  {
    title: 'Trim report latency',
    description: 'Review the SQL flow and remove obvious slow paths.',
    priority: 'Medium',
    durationMinutes: 60,
    requiredSkills: ['SQL', 'Testing'],
  },
  {
    title: 'Clean up view models',
    description: 'Make the React state shape easier to reason about.',
    priority: 'High',
    durationMinutes: 60,
    requiredSkills: ['React', 'TypeScript'],
  },
] as const;

const backlogContexts = [
  {
    title: 'release readiness',
    detail: 'the next release checkpoint and cleanup before handoff',
  },
  {
    title: 'admin flow',
    detail: 'the internal path used by ops and support',
  },
  {
    title: 'customer onboarding',
    detail: 'the first-run experience for new users',
  },
  {
    title: 'reporting',
    detail: 'the summary views leadership checks each morning',
  },
  {
    title: 'automation',
    detail: 'the repeatable path that should need less manual work',
  },
  {
    title: 'quality review',
    detail: 'the follow-up work that keeps regressions from spreading',
  },
  {
    title: 'customer escalation',
    detail: 'the urgent path support follows when something needs attention now',
  },
  {
    title: 'stakeholder prep',
    detail: 'the notes and edits that make the weekly update easier to read',
  },
] as const;

const assignedWorkItems = assignedPlans.map((plan, index) => ({
  id: `work-${index + 1}`,
  title: plan.title,
  description: plan.description,
  priority: plan.priority,
  durationMinutes: plan.durationMinutes,
  requiredSkills: [...plan.requiredSkills],
  targetDate: initialDate,
  status: 'scheduled' as const,
  assigneeId: plan.resourceId,
  bookingId: `booking-${index + 1}`,
}));

const unassignedWorkItems = Array.from({ length: 40 }, (_, index) => {
  const template = backlogTemplates[index % backlogTemplates.length];
  const context = backlogContexts[Math.floor(index / backlogTemplates.length)];
  const idNumber = assignedWorkItems.length + index + 1;

  return {
    id: `work-${idNumber}`,
    title: `${template.title} - ${context.title}`,
    description: `${template.description} Keep this focused on ${context.detail}.`,
    priority: template.priority,
    durationMinutes: template.durationMinutes,
    requiredSkills: [...template.requiredSkills],
    targetDate: initialDate,
    status: 'unscheduled' as const,
  };
});

const bookings = assignedPlans.map((plan, index) => {
  const [startHour, startMinute] = plan.startTime.split(':').map(Number);
  const start = `${initialDate}T${plan.startTime}`;
  const endDate = new Date(`${initialDate}T00:00:00`);
  endDate.setHours(startHour, startMinute + plan.durationMinutes, 0, 0);

  return {
    id: `booking-${index + 1}`,
    workItemId: `work-${index + 1}`,
    resourceId: plan.resourceId,
    startTime: start,
    endTime: formatLocalDateTime(endDate),
    status: 'scheduled' as const,
  };
});

export const state: AppState = {
  skills: ['ASP.NET Core', 'React', 'TypeScript', 'SQL', 'Testing', 'Azure', 'UX', 'Product', 'Accessibility'],
  resources: resourceSeeds.map((resource) => ({ ...resource })),
  workItems: [...assignedWorkItems, ...unassignedWorkItems],
  bookings,
};

const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const parseLocalDateTime = (date: string, hours: number, minutes: number) =>
  new Date(`${date}T00:00:00`).setHours(hours, minutes, 0, 0);

const formatIso = (ms: number) => new Date(ms).toISOString();

const minutesToMs = (minutes: number) => minutes * 60 * 1000;

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function resourceMatchesSkills(resource: Resource, workItem: WorkItem) {
  return workItem.requiredSkills.every((skill) => resource.skills.includes(skill));
}

export function getSuggestions(workItem: WorkItem) {
  return state.resources
    .map((resource) => {
      const skillHits = workItem.requiredSkills.filter((skill) => resource.skills.includes(skill)).length;
      const skillMatch = resourceMatchesSkills(resource, workItem);
      const available = findSlot(resource.id, workItem.targetDate, workItem.durationMinutes);
      const score = skillHits * 10 + (skillMatch ? 10 : 0) + (available ? 5 : 0);
      const rationale = [
        skillMatch ? 'full skill match' : `${skillHits}/${workItem.requiredSkills.length} skills`,
        available ? 'has a free slot' : 'no free slot found',
      ];

      return {
        resource,
        score,
        rationale,
        startTime: available?.startTime,
        endTime: available?.endTime,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function findSlot(resourceId: string, targetDate: string, durationMinutes: number) {
  const resource = state.resources.find((entry) => entry.id === resourceId);
  if (!resource) {
    return null;
  }

  const bookings = state.bookings.filter((booking) => booking.resourceId === resourceId && booking.status !== 'canceled');
  const durationMs = minutesToMs(durationMinutes);
  const step = 15;

  for (let hour = resource.workingHours.start; hour < resource.workingHours.end; hour += 1) {
    for (let minute = 0; minute < 60; minute += step) {
      const start = parseLocalDateTime(targetDate, hour, minute);
      const end = start + durationMs;
      const workdayEnd = parseLocalDateTime(targetDate, resource.workingHours.end, 0);

      if (end > workdayEnd) {
        continue;
      }

      const conflicting = bookings.some((booking) => {
        const bookingStart = Date.parse(booking.startTime);
        const bookingEnd = Date.parse(booking.endTime);
        return overlap(start, end, bookingStart, bookingEnd);
      });
      if (!conflicting) {
        return {
          startTime: formatIso(start),
          endTime: formatIso(end),
        };
      }
    }
  }

  return null;
}

export function createWorkItem(input: {
  title: string;
  description: string;
  priority: WorkItem['priority'];
  durationMinutes: number;
  targetDate: string;
  requiredSkills: string[];
}) {
  const workItem: WorkItem = {
    id: id('work'),
    title: input.title,
    description: input.description,
    priority: input.priority,
    durationMinutes: input.durationMinutes,
    targetDate: input.targetDate,
    requiredSkills: input.requiredSkills,
    status: 'unscheduled',
  };

  state.workItems.unshift(workItem);
  return workItem;
}

export function createResource(input: Resource) {
  state.resources.unshift(input);
  return input;
}

export function updateWorkItem(
  workItemId: string,
  input: {
    title?: string;
    description?: string;
    priority?: WorkItem['priority'];
    durationMinutes?: number;
    targetDate?: string;
    requiredSkills?: string[];
    assigneeId?: string | null;
  },
) {
  const workItem = state.workItems.find((entry) => entry.id === workItemId);

  if (!workItem) {
    throw new Error('Work item not found.');
  }

  const hasMetadataChange =
    input.title !== undefined ||
    input.description !== undefined ||
    input.priority !== undefined ||
    input.durationMinutes !== undefined ||
    input.targetDate !== undefined ||
    input.requiredSkills !== undefined;

  if (workItem.bookingId && hasMetadataChange) {
    throw new Error('Booked work items are locked.');
  }

  if (input.title !== undefined) {
    workItem.title = input.title;
  }

  if (input.description !== undefined) {
    workItem.description = input.description;
  }

  if (input.priority !== undefined) {
    workItem.priority = input.priority;
  }

  if (input.durationMinutes !== undefined) {
    workItem.durationMinutes = input.durationMinutes;
  }

  if (input.targetDate !== undefined) {
    workItem.targetDate = input.targetDate;
  }

  if (input.requiredSkills !== undefined) {
    workItem.requiredSkills = input.requiredSkills;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'assigneeId')) {
    if (input.assigneeId === null) {
      if (workItem.bookingId) {
        unassignWorkItem(workItemId);
      }
      return workItem;
    }

    if (input.assigneeId !== undefined) {
      if (workItem.bookingId) {
        reassignWorkItem(workItemId, input.assigneeId);
      } else {
        bookWorkItem(workItemId, input.assigneeId);
      }
    }
  }

  return workItem;
}

export function updateResource(
  resourceId: string,
  input: {
    name: string;
    discipline: Resource['discipline'];
    level: Resource['level'];
    skills: string[];
    color: string;
    workingHours: {
      start: number;
      end: number;
    };
  },
) {
  const resource = state.resources.find((entry) => entry.id === resourceId);

  if (!resource) {
    throw new Error('Resource not found.');
  }

  resource.name = input.name;
  resource.discipline = input.discipline;
  resource.level = input.level;
  resource.skills = input.skills;
  resource.color = input.color;
  resource.workingHours = input.workingHours;

  return resource;
}

export function bookWorkItem(workItemId: string, resourceId: string) {
  const workItem = state.workItems.find((entry) => entry.id === workItemId);
  const resource = state.resources.find((entry) => entry.id === resourceId);

  if (!workItem || !resource) {
    throw new Error('Work item or resource not found.');
  }

  if (workItem.bookingId) {
    throw new Error('Work item is already booked.');
  }

  if (!resourceMatchesSkills(resource, workItem)) {
    throw new Error('Resource does not have the required skills.');
  }

  const slot = findSlot(resourceId, workItem.targetDate, workItem.durationMinutes);
  if (!slot) {
    throw new Error('No free slot found for that resource.');
  }

  const booking: Booking = {
    id: id('booking'),
    workItemId,
    resourceId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: 'scheduled',
  };

  state.bookings.unshift(booking);
  workItem.bookingId = booking.id;
  workItem.assigneeId = resourceId;
  workItem.status = 'scheduled';

  return booking;
}

export function reassignWorkItem(workItemId: string, resourceId: string) {
  const workItem = state.workItems.find((entry) => entry.id === workItemId);
  const resource = state.resources.find((entry) => entry.id === resourceId);

  if (!workItem || !resource) {
    throw new Error('Work item or resource not found.');
  }

  if (!workItem.bookingId) {
    return bookWorkItem(workItemId, resourceId);
  }

  const booking = state.bookings.find((entry) => entry.id === workItem.bookingId);
  if (!booking) {
    throw new Error('Booking not found.');
  }

  if (booking.resourceId === resourceId) {
    return booking;
  }

  if (!resourceMatchesSkills(resource, workItem)) {
    throw new Error('Resource does not have the required skills.');
  }

  const slot = findSlot(resourceId, workItem.targetDate, workItem.durationMinutes);
  if (!slot) {
    throw new Error('No free slot found for that resource.');
  }

  booking.resourceId = resourceId;
  booking.startTime = slot.startTime;
  booking.endTime = slot.endTime;
  workItem.assigneeId = resourceId;
  workItem.status = 'scheduled';

  return booking;
}

export function unassignWorkItem(workItemId: string) {
  const workItem = state.workItems.find((entry) => entry.id === workItemId);

  if (!workItem) {
    throw new Error('Work item not found.');
  }

  if (!workItem.bookingId) {
    throw new Error('Work item is not assigned.');
  }

  state.bookings = state.bookings.filter((booking) => booking.id !== workItem.bookingId);
  workItem.bookingId = undefined;
  workItem.assigneeId = undefined;
  workItem.status = 'unscheduled';

  return workItem;
}

export function setBookingStatus(bookingId: string, status: Booking['status']) {
  const booking = state.bookings.find((entry) => entry.id === bookingId);
  if (!booking) {
    throw new Error('Booking not found.');
  }

  booking.status = status;

  const workItem = state.workItems.find((entry) => entry.id === booking.workItemId);
  if (workItem) {
    workItem.status = status === 'completed' ? 'completed' : 'scheduled';
  }

  return booking;
}

const priorityRank: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
  };
}

export type WorkItemSort = 'priority' | 'date' | 'name' | 'duration';

export interface WorkItemQuery {
  page?: unknown;
  pageSize?: unknown;
  search?: string;
  status?: string;
  priority?: string;
  skill?: string;
  sort?: string;
  sortDir?: string;
}

const sortDefaultDirection: Record<WorkItemSort, 'asc' | 'desc'> = {
  priority: 'desc',
  date: 'asc',
  name: 'asc',
  duration: 'desc',
};

export function queryWorkItems(query: WorkItemQuery): Page<WorkItem> {
  const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(query.pageSize, 10, 1, 100);
  const search = (query.search ?? '').trim().toLowerCase();
  const statuses = query.status && query.status !== 'all' ? query.status.split(',').filter(Boolean) : [];
  const priorities = query.priority && query.priority !== 'all' ? query.priority.split(',').filter(Boolean) : [];
  const skills = query.skill && query.skill !== 'all' ? query.skill.split(',').filter(Boolean) : [];
  const sort: WorkItemSort = (['priority', 'date', 'name', 'duration'] as const).includes(
    query.sort as WorkItemSort,
  )
    ? (query.sort as WorkItemSort)
    : 'priority';
  const dir = (query.sortDir === 'asc' ? 'asc' : query.sortDir === 'desc' ? 'desc' : sortDefaultDirection[sort]) === 'asc' ? 1 : -1;

  let items = state.workItems.filter((item) => {
    if (statuses.length > 0) {
      const itemStatus = item.status === 'unscheduled' ? 'open' : 'assigned';
      if (!statuses.includes(itemStatus)) {
        return false;
      }
    }
    if (priorities.length > 0 && !priorities.includes(item.priority)) {
      return false;
    }
    if (skills.length > 0 && !skills.every((skill) => item.requiredSkills.includes(skill))) {
      return false;
    }
    if (search) {
      const haystack = [item.title, item.description, item.priority, item.targetDate, ...item.requiredSkills]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });

  items = [...items].sort((a, b) => {
    switch (sort) {
      case 'name':
        return dir * a.title.localeCompare(b.title);
      case 'duration':
        return dir * (a.durationMinutes - b.durationMinutes) || a.title.localeCompare(b.title);
      case 'date':
        return dir * a.targetDate.localeCompare(b.targetDate) || priorityRank[b.priority] - priorityRank[a.priority] || a.title.localeCompare(b.title);
      case 'priority':
      default:
        return (
          dir * (priorityRank[a.priority] - priorityRank[b.priority]) ||
          a.targetDate.localeCompare(b.targetDate) ||
          a.title.localeCompare(b.title)
        );
    }
  });

  return paginate(items, page, pageSize);
}

export interface ResourceQuery {
  page?: unknown;
  pageSize?: unknown;
  search?: string;
  discipline?: string;
}

export function queryResources(query: ResourceQuery): Page<Resource> {
  const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(query.pageSize, 8, 1, 100);
  const search = (query.search ?? '').trim().toLowerCase();
  const discipline = query.discipline ?? 'all';
  const disciplines: ResourceDiscipline[] = ['Engineer', 'Data scientist'];
  const disciplineFilter = disciplines.includes(discipline as ResourceDiscipline)
    ? (discipline as ResourceDiscipline)
    : null;

  const items = state.resources
    .filter((resource) => {
      if (disciplineFilter && resource.discipline !== disciplineFilter) {
        return false;
      }
      if (search && !resource.name.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return paginate(items, page, pageSize);
}
