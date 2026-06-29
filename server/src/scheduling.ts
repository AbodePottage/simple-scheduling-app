import type { AppState, Booking, Resource, WorkItem } from './domain.js';

const initialDate = new Date().toISOString().slice(0, 10);

export const state: AppState = {
  skills: ['ASP.NET Core', 'React', 'TypeScript', 'SQL', 'Testing', 'Azure', 'UX', 'Product', 'Accessibility'],
  resources: [
    {
      id: 'resource-1',
      name: 'Nina Brooks',
      role: 'Backend engineer',
      skills: ['ASP.NET Core', 'SQL', 'Testing'],
      color: '#1d4ed8',
      workingHours: { start: 9, end: 17 },
    },
    {
      id: 'resource-2',
      name: 'Mateo Silva',
      role: 'Frontend engineer',
      skills: ['React', 'TypeScript', 'Accessibility'],
      color: '#7c3aed',
      workingHours: { start: 9, end: 17 },
    },
    {
      id: 'resource-3',
      name: 'Priya Desai',
      role: 'Full stack engineer',
      skills: ['ASP.NET Core', 'React', 'Testing'],
      color: '#059669',
      workingHours: { start: 9, end: 17 },
    },
    {
      id: 'resource-4',
      name: 'Omar Haddad',
      role: 'Platform engineer',
      skills: ['ASP.NET Core', 'Azure', 'SQL'],
      color: '#ea580c',
      workingHours: { start: 8, end: 16 },
    },
    {
      id: 'resource-5',
      name: 'Elena Kim',
      role: 'QA engineer',
      skills: ['Testing', 'React', 'Accessibility'],
      color: '#db2777',
      workingHours: { start: 9, end: 17 },
    },
    {
      id: 'resource-6',
      name: 'Lucas Reed',
      role: 'Product engineer',
      skills: ['Product', 'UX', 'React'],
      color: '#0f766e',
      workingHours: { start: 9, end: 17 },
    },
    {
      id: 'resource-7',
      name: 'Sofia Ivanov',
      role: 'Data engineer',
      skills: ['SQL', 'Azure', 'Testing'],
      color: '#4f46e5',
      workingHours: { start: 10, end: 18 },
    },
  ],
  workItems: [
    {
      id: 'work-1',
      title: 'Harden health endpoints',
      description: 'Stabilize the ASP.NET Core health checks and surface clear failure details.',
      priority: 'High',
      durationMinutes: 60,
      requiredSkills: ['ASP.NET Core', 'Testing'],
      targetDate: initialDate,
      status: 'scheduled',
      assigneeId: 'resource-1',
      bookingId: 'booking-1',
    },
    {
      id: 'work-4',
      title: 'Wire auth session UX',
      description: 'Connect the React UI to the backend login state and improve the handoff flow.',
      priority: 'Medium',
      durationMinutes: 60,
      requiredSkills: ['ASP.NET Core', 'React'],
      targetDate: initialDate,
      status: 'scheduled',
      assigneeId: 'resource-3',
      bookingId: 'booking-2',
    },
    {
      id: 'work-5',
      title: 'Build settings panel',
      description: 'Create the React settings flow and keep form state responsive.',
      priority: 'High',
      durationMinutes: 60,
      requiredSkills: ['React', 'TypeScript'],
      targetDate: initialDate,
      status: 'scheduled',
      assigneeId: 'resource-2',
      bookingId: 'booking-3',
    },
    {
      id: 'work-6',
      title: 'Tune deployment pipeline',
      description: 'Adjust Azure deployment checks and keep the backend release path reliable.',
      priority: 'Low',
      durationMinutes: 60,
      requiredSkills: ['Azure', 'ASP.NET Core'],
      targetDate: initialDate,
      status: 'scheduled',
      assigneeId: 'resource-4',
      bookingId: 'booking-4',
    },
    {
      id: 'work-7',
      title: 'Expand regression coverage',
      description: 'Add Playwright coverage for the most important booking and edit flows.',
      priority: 'Medium',
      durationMinutes: 60,
      requiredSkills: ['Testing', 'React'],
      targetDate: initialDate,
      status: 'scheduled',
      assigneeId: 'resource-5',
      bookingId: 'booking-5',
    },
    {
      id: 'work-8',
      title: 'Refine dashboard copy',
      description: 'Make the scheduling screen copy shorter and easier to scan.',
      priority: 'Low',
      durationMinutes: 45,
      requiredSkills: ['Product', 'UX'],
      targetDate: initialDate,
      status: 'scheduled',
      assigneeId: 'resource-6',
      bookingId: 'booking-6',
    },
    {
      id: 'work-9',
      title: 'Prepare data export job',
      description: 'Shape the SQL-backed export job and confirm it fits the reporting needs.',
      priority: 'Medium',
      durationMinutes: 60,
      requiredSkills: ['SQL', 'Azure'],
      targetDate: initialDate,
      status: 'scheduled',
      assigneeId: 'resource-7',
      bookingId: 'booking-7',
    },
    {
      id: 'work-10',
      title: 'Map API controller boundaries',
      description: 'Split the ASP.NET Core endpoints into clearer feature areas.',
      priority: 'High',
      durationMinutes: 60,
      requiredSkills: ['ASP.NET Core'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
    {
      id: 'work-11',
      title: 'Improve drag and drop accessibility',
      description: 'Add clearer keyboard and focus behavior to the React scheduling board.',
      priority: 'Low',
      durationMinutes: 45,
      requiredSkills: ['React', 'Accessibility'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
    {
      id: 'work-12',
      title: 'Add API state handling',
      description: 'Handle loading and error states cleanly in the React data layer.',
      priority: 'Medium',
      durationMinutes: 60,
      requiredSkills: ['TypeScript', 'React'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
    {
      id: 'work-13',
      title: 'Document service contracts',
      description: 'Write down request and response shapes for the ASP.NET Core backend.',
      priority: 'Low',
      durationMinutes: 45,
      requiredSkills: ['ASP.NET Core', 'Product'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
    {
      id: 'work-14',
      title: 'Write end-to-end booking tests',
      description: 'Cover assignment, reassignment, and unassignment across the stack.',
      priority: 'High',
      durationMinutes: 60,
      requiredSkills: ['Testing', 'React'],
      targetDate: initialDate,
      status: 'unscheduled',
    },
  ],
  bookings: [
    {
      id: 'booking-1',
      workItemId: 'work-1',
      resourceId: 'resource-1',
      startTime: `${initialDate}T09:00:00`,
      endTime: `${initialDate}T10:00:00`,
      status: 'scheduled',
    },
    {
      id: 'booking-2',
      workItemId: 'work-4',
      resourceId: 'resource-3',
      startTime: `${initialDate}T09:30:00`,
      endTime: `${initialDate}T10:30:00`,
      status: 'scheduled',
    },
    {
      id: 'booking-3',
      workItemId: 'work-5',
      resourceId: 'resource-2',
      startTime: `${initialDate}T10:00:00`,
      endTime: `${initialDate}T11:00:00`,
      status: 'scheduled',
    },
    {
      id: 'booking-4',
      workItemId: 'work-6',
      resourceId: 'resource-4',
      startTime: `${initialDate}T11:00:00`,
      endTime: `${initialDate}T12:00:00`,
      status: 'scheduled',
    },
    {
      id: 'booking-5',
      workItemId: 'work-7',
      resourceId: 'resource-5',
      startTime: `${initialDate}T12:30:00`,
      endTime: `${initialDate}T13:30:00`,
      status: 'scheduled',
    },
    {
      id: 'booking-6',
      workItemId: 'work-8',
      resourceId: 'resource-6',
      startTime: `${initialDate}T13:00:00`,
      endTime: `${initialDate}T13:45:00`,
      status: 'scheduled',
    },
    {
      id: 'booking-7',
      workItemId: 'work-9',
      resourceId: 'resource-7',
      startTime: `${initialDate}T14:00:00`,
      endTime: `${initialDate}T15:00:00`,
      status: 'scheduled',
    },
  ],
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
