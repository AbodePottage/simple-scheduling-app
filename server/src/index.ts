import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ResourceDiscipline, ResourceLevel } from './domain.js';
import {
  bookWorkItem,
  createResource,
  createWorkItem,
  getSuggestions,
  queryResources,
  queryWorkItems,
  setBookingStatus,
  state,
  updateResource,
  updateWorkItem,
} from './scheduling.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);
const clientDist = path.resolve(__dirname, '../../client/dist');
const resourceDisciplines: ResourceDiscipline[] = ['Engineer', 'Data scientist'];
const resourceLevels: ResourceLevel[] = ['Junior', 'Senior', 'Principal', 'Manager'];

function parseResourceDiscipline(value: unknown): ResourceDiscipline | null {
  return typeof value === 'string' && resourceDisciplines.includes(value as ResourceDiscipline)
    ? (value as ResourceDiscipline)
    : null;
}

function parseResourceLevel(value: unknown): ResourceLevel | null {
  return typeof value === 'string' && resourceLevels.includes(value as ResourceLevel)
    ? (value as ResourceLevel)
    : null;
}

app.use(cors());
app.use(express.json());

app.get('/api/bootstrap', (_request, response) => {
  response.json(state);
});

app.get('/api/work-items', (request, response) => {
  const { page, pageSize, search, status, priority, skill, sort } = request.query;
  response.json(
    queryWorkItems({
      page,
      pageSize,
      search: typeof search === 'string' ? search : undefined,
      status: typeof status === 'string' ? status : undefined,
      priority: typeof priority === 'string' ? priority : undefined,
      skill: typeof skill === 'string' ? skill : undefined,
      sort: typeof sort === 'string' ? sort : undefined,
    }),
  );
});

app.get('/api/resources', (request, response) => {
  const { page, pageSize, search, discipline } = request.query;
  response.json(
    queryResources({
      page,
      pageSize,
      search: typeof search === 'string' ? search : undefined,
      discipline: typeof discipline === 'string' ? discipline : undefined,
    }),
  );
});

app.get('/api/suggestions/:workItemId', (request, response) => {
  const workItem = state.workItems.find((entry) => entry.id === request.params.workItemId);
  if (!workItem) {
    response.status(404).json({ error: 'Work item not found.' });
    return;
  }

  response.json(getSuggestions(workItem));
});

app.post('/api/work-items', (request, response) => {
  const { title, description, priority, durationMinutes, targetDate, requiredSkills } = request.body ?? {};

  if (!title || !targetDate || !priority || !durationMinutes) {
    response.status(400).json({ error: 'Missing required fields.' });
    return;
  }

  const workItem = createWorkItem({
    title: String(title),
    description: String(description ?? ''),
    priority,
    durationMinutes: Number(durationMinutes),
    targetDate: String(targetDate),
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills.map(String) : [],
  });

  response.status(201).json(workItem);
});

app.post('/api/resources', (request, response) => {
  const { name, discipline, level, skills, color, workingHours } = request.body ?? {};
  const parsedDiscipline = parseResourceDiscipline(discipline);
  const parsedLevel = parseResourceLevel(level);

  if (!name || !parsedDiscipline || !parsedLevel || !color || !workingHours) {
    response.status(400).json({ error: 'Missing required fields.' });
    return;
  }

  const resource = createResource({
    id: `resource-${Math.random().toString(36).slice(2, 9)}`,
    name: String(name),
    discipline: parsedDiscipline,
    level: parsedLevel,
    skills: Array.isArray(skills) ? skills.map(String) : [],
    color: String(color),
    workingHours: {
      start: Number(workingHours.start),
      end: Number(workingHours.end),
    },
  });

  response.status(201).json(resource);
});

app.patch('/api/resources/:resourceId', (request, response) => {
  const { name, discipline, level, skills, color, workingHours } = request.body ?? {};
  const parsedDiscipline = parseResourceDiscipline(discipline);
  const parsedLevel = parseResourceLevel(level);

  if (!name || !parsedDiscipline || !parsedLevel || !color || !workingHours) {
    response.status(400).json({ error: 'Missing required fields.' });
    return;
  }

  try {
    const resource = updateResource(request.params.resourceId, {
      name: String(name),
      discipline: parsedDiscipline,
      level: parsedLevel,
      skills: Array.isArray(skills) ? skills.map(String) : [],
      color: String(color),
      workingHours: {
        start: Number(workingHours.start),
        end: Number(workingHours.end),
      },
    });

    response.json(resource);
  } catch (error) {
    response.status(404).json({ error: error instanceof Error ? error.message : 'Could not update resource.' });
  }
});

app.patch('/api/work-items/:workItemId', (request, response) => {
  try {
    const workItem = updateWorkItem(request.params.workItemId, {
      title: request.body?.title !== undefined ? String(request.body.title) : undefined,
      description: request.body?.description !== undefined ? String(request.body.description ?? '') : undefined,
      priority: request.body?.priority,
      durationMinutes: request.body?.durationMinutes !== undefined ? Number(request.body.durationMinutes) : undefined,
      targetDate: request.body?.targetDate !== undefined ? String(request.body.targetDate) : undefined,
      requiredSkills: request.body?.requiredSkills !== undefined ? request.body.requiredSkills.map(String) : undefined,
      assigneeId:
        Object.prototype.hasOwnProperty.call(request.body ?? {}, 'assigneeId')
          ? request.body.assigneeId === null
            ? null
            : String(request.body.assigneeId)
          : undefined,
    });

    response.json(workItem);
  } catch (error) {
    response.status(409).json({ error: error instanceof Error ? error.message : 'Could not update work item.' });
  }
});

app.post('/api/bookings', (request, response) => {
  const { workItemId, resourceId } = request.body ?? {};

  if (!workItemId || !resourceId) {
    response.status(400).json({ error: 'Missing workItemId or resourceId.' });
    return;
  }

  try {
    const booking = bookWorkItem(String(workItemId), String(resourceId));
    response.status(201).json(booking);
  } catch (error) {
    response.status(409).json({ error: error instanceof Error ? error.message : 'Could not create booking.' });
  }
});

app.patch('/api/bookings/:bookingId', (request, response) => {
  try {
    const booking = setBookingStatus(request.params.bookingId, request.body.status);
    response.json(booking);
  } catch (error) {
    response.status(404).json({ error: error instanceof Error ? error.message : 'Could not update booking.' });
  }
});

app.use(express.static(clientDist));

app.get('*', (_request, response) => {
  response.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`Scheduling app API running on http://localhost:${port}`);
});
