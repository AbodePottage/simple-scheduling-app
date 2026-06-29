import type { AppState, Booking, Resource, WorkItem } from './domain.js';

const initialDate = new Date().toISOString().slice(0, 10);

export const state: AppState = {
  skills: ['React', 'Node', 'Testing', 'Ops', 'Product'],
  resources: [
    {
      id: 'resource-1',
      name: 'Avery Chen',
      role: 'Frontend engineer',
      skills: ['React', 'Testing'],
      color: '#1d4ed8',
      workingHours: { start: 9, end: 17 },
    },
    {
      id: 'resource-2',
      name: 'Jordan Patel',
      role: 'Full stack engineer',
      skills: ['React', 'Node', 'Testing'],
      color: '#7c3aed',
      workingHours: { start: 9, end: 17 },
    },
    {
      id: 'resource-3',
      name: 'Morgan Lee',
      role: 'Ops engineer',
      skills: ['Node', 'Ops'],
      color: '#059669',
      workingHours: { start: 6, end: 14 },
    },
  ],
  workItems: [
    {
      id: 'work-1',
      title: 'Prepare release checklist',
      description: 'Pull together the release readiness work for the sprint review.',
      priority: 'High',
      durationMinutes: 60,
      requiredSkills: ['Node'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
    {
      id: 'work-2',
      title: 'Fix schedule board filter',
      description: 'Improve the board filter and make the current selection persist.',
      priority: 'Medium',
      durationMinutes: 90,
      requiredSkills: ['React', 'Testing'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
    {
      id: 'work-3',
      title: 'Write booking tests',
      description: 'Cover overlap checks and assignment rules.',
      priority: 'Low',
      durationMinutes: 45,
      requiredSkills: ['Testing'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
  ],
  bookings: [],
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
    role: string;
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
  resource.role = input.role;
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
