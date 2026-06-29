export type WorkItemStatus = 'unscheduled' | 'scheduled' | 'in_progress' | 'completed';
export type BookingStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled';
export type Priority = 'Low' | 'Medium' | 'High';

export interface Resource {
  id: string;
  name: string;
  role: string;
  skills: string[];
  color: string;
  workingHours: {
    start: number;
    end: number;
  };
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  durationMinutes: number;
  requiredSkills: string[];
  targetDate: string;
  status: WorkItemStatus;
  assigneeId?: string;
  bookingId?: string;
}

export interface Booking {
  id: string;
  workItemId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

export interface AppState {
  resources: Resource[];
  workItems: WorkItem[];
  bookings: Booking[];
  skills: string[];
}

