import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookWorkItem, createWorkItem, getSuggestions, setBookingStatus, state } from './scheduling.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);
const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(cors());
app.use(express.json());

app.get('/api/bootstrap', (_request, response) => {
  response.json(state);
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

