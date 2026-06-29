import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BootstrapResponse, Booking, Resource, Suggestion, WorkItem, Priority } from './types';

const priorityOrder: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function skillLabel(skills: string[]) {
  return skills.length ? skills.join(', ') : 'None';
}

export function App() {
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Medium' as Priority,
    durationMinutes: 60,
    targetDate: new Date().toISOString().slice(0, 10),
    requiredSkills: [] as string[],
  });
  const [draggingWorkItemId, setDraggingWorkItemId] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch('/api/bootstrap');
    setData((await response.json()) as BootstrapResponse);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedWorkItemId) {
      setSuggestions([]);
      return;
    }

    void (async () => {
      const response = await fetch(`/api/suggestions/${selectedWorkItemId}`);
      setSuggestions((await response.json()) as Suggestion[]);
    })();
  }, [selectedWorkItemId]);

  const workItemLookup = useMemo(() => {
    const map = new Map<string, WorkItem>();
    data?.workItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [data]);

  const resourceLookup = useMemo(() => {
    const map = new Map<string, Resource>();
    data?.resources.forEach((resource) => map.set(resource.id, resource));
    return map;
  }, [data]);

  const skillOptions = useMemo(() => ['All', ...(data?.skills ?? [])], [data]);

  const visibleResources = useMemo(() => {
    if (!data) {
      return [];
    }

    if (selectedSkill === 'All') {
      return data.resources;
    }

    return data.resources.filter((resource) => resource.skills.includes(selectedSkill));
  }, [data, selectedSkill]);

  const visibleWorkItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.workItems.filter((item) => {
      if (selectedSkill === 'All') {
        return true;
      }

      return item.requiredSkills.length === 0 || item.requiredSkills.includes(selectedSkill);
    });
  }, [data, selectedSkill]);

  const selectedWorkItem = selectedWorkItemId ? workItemLookup.get(selectedWorkItemId) ?? null : null;

  const submitWorkItem = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch('/api/work-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      return;
    }

    setForm({
      title: '',
      description: '',
      priority: 'Medium',
      durationMinutes: 60,
      targetDate: new Date().toISOString().slice(0, 10),
      requiredSkills: [],
    });
    await load();
  };

  const toggleSkill = (skill: string) => {
    setForm((current) => ({
      ...current,
      requiredSkills: current.requiredSkills.includes(skill)
        ? current.requiredSkills.filter((entry) => entry !== skill)
        : [...current.requiredSkills, skill],
    }));
  };

  const assignWorkItem = async (workItemId: string, resourceId: string) => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workItemId, resourceId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      alert(body?.error ?? 'Could not book work item.');
      return;
    }

    await load();
  };

  const selectedItemBooking = selectedWorkItem?.bookingId
    ? data?.bookings.find((booking) => booking.id === selectedWorkItem.bookingId) ?? null
    : null;

  if (!data) {
    return <main className="shell">Loading scheduling board...</main>;
  }

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Simple scheduling app</p>
          <h1>Assign work fast</h1>
          <p className="subtitle">Schedule-board-first MVP with a small matching engine.</p>
        </div>

        <label className="filter">
          Filter by skill
          <select value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>
            {skillOptions.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="composer card">
        <form onSubmit={submitWorkItem}>
          <div className="grid">
            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Prepare release notes"
                required
              />
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
            <label>
              Duration
              <select
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </label>
            <label>
              Target date
              <input
                type="date"
                value={form.targetDate}
                onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
                required
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={2}
              placeholder="Short description of the work."
            />
          </label>

          <div className="skills">
            <span>Required skills</span>
            <div>
              {data.skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={form.requiredSkills.includes(skill) ? 'chip active' : 'chip'}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <button className="primary" type="submit">
            Add work item
          </button>
        </form>
      </section>

      <section className="workspace">
        <aside className="card queue">
          <h2>Unscheduled work</h2>
          {visibleWorkItems.filter((item) => item.status === 'unscheduled').map((item) => (
            <article
              key={item.id}
              className={selectedWorkItemId === item.id ? 'work-item selected' : 'work-item'}
              draggable
              onDragStart={() => setDraggingWorkItemId(item.id)}
              onDragEnd={() => setDraggingWorkItemId(null)}
              onClick={() => setSelectedWorkItemId(item.id)}
            >
              <div className="row">
                <strong>{item.title}</strong>
                <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
              </div>
              <p>{item.description}</p>
              <small>{item.durationMinutes} min - {skillLabel(item.requiredSkills)}</small>
            </article>
          ))}
        </aside>

        <section className="board">
          <div className="board-header">
            <h2>Schedule board</h2>
            <p>Drag work onto a resource or use the suggestion panel.</p>
          </div>

          <div className="resource-grid">
            {visibleResources.map((resource) => {
              const bookings = data.bookings.filter((booking) => booking.resourceId === resource.id);
              return (
                <div
                  key={resource.id}
                  className="resource-row"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggingWorkItemId) {
                      void assignWorkItem(draggingWorkItemId, resource.id);
                    }
                  }}
                >
                  <div className="resource-card">
                    <strong>{resource.name}</strong>
                    <span>{resource.role}</span>
                    <small>{skillLabel(resource.skills)}</small>
                  </div>
                  <div className="booking-strip">
                    {bookings.map((booking) => {
                      const workItem = workItemLookup.get(booking.workItemId);
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          className="booking-card"
                          onClick={() => setSelectedWorkItemId(booking.workItemId)}
                        >
                          <strong>{workItem?.title ?? 'Booking'}</strong>
                          {' '}
                          <span>
                            {formatClock(booking.startTime)} - {formatClock(booking.endTime)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="card inspector">
          <h2>Details</h2>
          {selectedWorkItem ? (
            <>
              <p className="eyebrow">{selectedWorkItem.priority} priority</p>
              <h3>{selectedWorkItem.title}</h3>
              <p>{selectedWorkItem.description}</p>
              <p><strong>Skills:</strong> {skillLabel(selectedWorkItem.requiredSkills)}</p>
              <p><strong>Duration:</strong> {selectedWorkItem.durationMinutes} minutes</p>
              <p><strong>Status:</strong> {selectedWorkItem.status}</p>

              {selectedItemBooking ? (
                <p>
                  <strong>Booked:</strong> {resourceLookup.get(selectedItemBooking.resourceId)?.name ?? 'Unknown'} -{' '}
                  {formatClock(selectedItemBooking.startTime)} to {formatClock(selectedItemBooking.endTime)}
                </p>
              ) : (
                <p><strong>Booked:</strong> Not yet scheduled</p>
              )}

              <div className="suggestions">
                <h4>Suggested assignees</h4>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.resource.id}
                    type="button"
                    className="suggestion"
                    onClick={() => void assignWorkItem(selectedWorkItem.id, suggestion.resource.id)}
                  >
                    <strong>{suggestion.resource.name}</strong>
                    <span>Score {suggestion.score}</span>
                    <small>{suggestion.rationale.join(', ')}</small>
                  </button>
                ))}
                {!suggestions.length ? <p>No suggestions yet.</p> : null}
              </div>
            </>
          ) : (
            <p>Select a work item to see details and suggestions.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
