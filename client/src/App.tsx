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
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editingWorkItemId, setEditingWorkItemId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const blankForm = useMemo(
    () => ({
      title: '',
      description: '',
      priority: 'Medium' as Priority,
      durationMinutes: 60,
      targetDate: new Date().toISOString().slice(0, 10),
      requiredSkills: [] as string[],
    }),
    [],
  );
  const [form, setForm] = useState({
    ...blankForm,
  });
  const blankResourceForm = useMemo(
    () => ({
      name: '',
      role: '',
      color: '#1d4ed8',
      workingHours: { start: 9, end: 17 },
      skills: [] as string[],
    }),
    [],
  );
  const [resourceForm, setResourceForm] = useState({
    ...blankResourceForm,
  });
  const [draggingWorkItemId, setDraggingWorkItemId] = useState<string | null>(null);
  const [draggingBookingId, setDraggingBookingId] = useState<string | null>(null);

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
  const selectedResource = selectedResourceId ? resourceLookup.get(selectedResourceId) ?? null : null;
  const editingWorkItem = editingWorkItemId ? workItemLookup.get(editingWorkItemId) ?? null : null;
  const editingResource = editingResourceId ? resourceLookup.get(editingResourceId) ?? null : null;

  const submitWorkItem = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch(editingWorkItemId ? `/api/work-items/${editingWorkItemId}` : '/api/work-items', {
      method: editingWorkItemId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      return;
    }

    setForm(blankForm);
    setEditingWorkItemId(null);
    await load();
  };

  const patchWorkItem = async (workItemId: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/work-items/${workItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      alert(body?.error ?? 'Could not update work item.');
      return;
    }

    await load();
  };

  const beginEditWorkItem = (workItem: WorkItem) => {
    setSelectedResourceId(null);
    setEditingWorkItemId(workItem.id);
    setForm({
      title: workItem.title,
      description: workItem.description,
      priority: workItem.priority,
      durationMinutes: workItem.durationMinutes,
      targetDate: workItem.targetDate,
      requiredSkills: [...workItem.requiredSkills],
    });
  };

  const cancelEdit = () => {
    setEditingWorkItemId(null);
    setForm(blankForm);
  };

  const submitResource = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch(editingResourceId ? `/api/resources/${editingResourceId}` : '/api/resources', {
      method: editingResourceId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resourceForm),
    });

    if (!response.ok) {
      return;
    }

    setResourceForm(blankResourceForm);
    setEditingResourceId(null);
    await load();
  };

  const beginEditResource = (resource: Resource) => {
    setSelectedWorkItemId(null);
    setSelectedResourceId(resource.id);
    setEditingResourceId(resource.id);
    setResourceForm({
      name: resource.name,
      role: resource.role,
      color: resource.color,
      workingHours: { ...resource.workingHours },
      skills: [...resource.skills],
    });
  };

  const cancelResourceEdit = () => {
    setEditingResourceId(null);
    setResourceForm(blankResourceForm);
  };

  const toggleSkill = (skill: string) => {
    setForm((current) => ({
      ...current,
      requiredSkills: current.requiredSkills.includes(skill)
        ? current.requiredSkills.filter((entry) => entry !== skill)
        : [...current.requiredSkills, skill],
    }));
  };

  const toggleResourceSkill = (skill: string) => {
    setResourceForm((current) => ({
      ...current,
      skills: current.skills.includes(skill)
        ? current.skills.filter((entry) => entry !== skill)
        : [...current.skills, skill],
    }));
  };

  const handleQueueDrop = async () => {
    if (!data || !draggingBookingId) {
      return;
    }

    const booking = data.bookings.find((entry) => entry.id === draggingBookingId);
    if (!booking) {
      setDraggingBookingId(null);
      return;
    }

    await patchWorkItem(booking.workItemId, { assigneeId: null });
    setDraggingBookingId(null);
  };

  const selectedItemBooking = selectedWorkItem?.bookingId
    ? data?.bookings.find((booking) => booking.id === selectedWorkItem.bookingId) ?? null
    : null;

  if (!data) {
    return <main className="shell">Loading scheduling board...</main>;
  }

  return (
    <main className="shell">
      <header className="hero card">
        <div className="hero-copy">
          <p className="eyebrow">Simple scheduling app</p>
          <h1>Assign work fast</h1>
          <p className="subtitle">Schedule-board-first MVP with a small matching engine.</p>
          <div className="hero-stats">
            <span className="stat-pill">Resources</span>
            <span className="stat-pill">Work items</span>
            <span className="stat-pill">Drag and drop assignment</span>
          </div>
        </div>

        <label className="filter hero-filter">
          <span>Filter by skill</span>
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
          <div className="composer-header">
            <div>
              <p className="eyebrow">{editingWorkItem ? 'Edit work item' : 'Create work item'}</p>
              <h2>{editingWorkItem ? editingWorkItem.title : 'Add new work'}</h2>
            </div>
            {editingWorkItem ? (
              <button type="button" className="secondary" onClick={cancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>

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
            {editingWorkItem ? 'Update work item' : 'Add work item'}
          </button>
        </form>
      </section>

      <section className="workspace">
        <aside className="card queue" onDragOver={(event) => event.preventDefault()} onDrop={() => void handleQueueDrop()}>
          <h2>Unscheduled work</h2>
          {visibleWorkItems.filter((item) => item.status === 'unscheduled').map((item) => (
            <article
              key={item.id}
              className={selectedWorkItemId === item.id ? 'work-item selected' : 'work-item'}
              draggable
              onDragStart={() => {
                setDraggingBookingId(null);
                setDraggingWorkItemId(item.id);
              }}
              onDragEnd={() => {
                setDraggingWorkItemId(null);
                setDraggingBookingId(null);
              }}
              onClick={() => {
                setSelectedResourceId(null);
                setSelectedWorkItemId(item.id);
              }}
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
                    if (draggingBookingId) {
                      const booking = data.bookings.find((entry) => entry.id === draggingBookingId);
                      if (booking) {
                        void patchWorkItem(booking.workItemId, { assigneeId: resource.id });
                      }
                      return;
                    }

                    if (draggingWorkItemId) {
                      void patchWorkItem(draggingWorkItemId, { assigneeId: resource.id });
                    }
                  }}
                >
                  <button
                    type="button"
                    className={selectedResourceId === resource.id ? 'resource-card selected' : 'resource-card'}
                    onClick={() => {
                      setSelectedWorkItemId(null);
                      setSelectedResourceId(resource.id);
                    }}
                  >
                    <strong>{resource.name}</strong>
                    <span>{resource.role}</span>
                    <small>{skillLabel(resource.skills)}</small>
                  </button>
                  <div className="booking-strip">
                    {bookings.map((booking) => {
                      const workItem = workItemLookup.get(booking.workItemId);
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          className="booking-card"
                          draggable
                          onDragStart={() => {
                            setDraggingWorkItemId(null);
                            setDraggingBookingId(booking.id);
                          }}
                          onDragEnd={() => {
                            setDraggingWorkItemId(null);
                            setDraggingBookingId(null);
                          }}
                          onClick={() => {
                            setSelectedResourceId(null);
                            setSelectedWorkItemId(booking.workItemId);
                          }}
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
          {selectedResource ? (
            <>
              <p className="eyebrow">Resource</p>
              <h3>{selectedResource.name}</h3>
              <p>{selectedResource.role}</p>
              <p><strong>Skills:</strong> {skillLabel(selectedResource.skills)}</p>
              <p><strong>Working hours:</strong> {selectedResource.workingHours.start}:00 to {selectedResource.workingHours.end}:00</p>
              <p><strong>Color:</strong> {selectedResource.color}</p>
              <button type="button" className="secondary" onClick={() => beginEditResource(selectedResource)}>
                Edit resource
              </button>
              <div className="resource-bookings">
                <h4>Assigned work</h4>
                {data.bookings.filter((booking) => booking.resourceId === selectedResource.id).map((booking) => {
                  const workItem = workItemLookup.get(booking.workItemId);
                  return (
                    <div key={booking.id} className="booking-summary">
                      <strong>{workItem?.title ?? 'Booking'}</strong>
                      <span>{formatClock(booking.startTime)} - {formatClock(booking.endTime)}</span>
                    </div>
                  );
                })}
                {!data.bookings.some((booking) => booking.resourceId === selectedResource.id) ? (
                  <p className="help-text">No work assigned yet.</p>
                ) : null}
              </div>
            </>
          ) : selectedWorkItem ? (
            <>
              <p className="eyebrow">{selectedWorkItem.priority} priority</p>
              <h3>{selectedWorkItem.title}</h3>
              <p>{selectedWorkItem.description}</p>
              <p><strong>Skills:</strong> {skillLabel(selectedWorkItem.requiredSkills)}</p>
              <p><strong>Duration:</strong> {selectedWorkItem.durationMinutes} minutes</p>
              <p><strong>Status:</strong> {selectedWorkItem.status}</p>

              {selectedWorkItem.status === 'unscheduled' ? (
                <button type="button" className="secondary" onClick={() => beginEditWorkItem(selectedWorkItem)}>
                  Edit work item
                </button>
              ) : (
                <>
                  <p className="help-text">Booked items are read-only in this MVP.</p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void patchWorkItem(selectedWorkItem.id, { assigneeId: null })}
                  >
                    Unassign work item
                  </button>
                </>
              )}

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
                    onClick={() => void patchWorkItem(selectedWorkItem.id, { assigneeId: suggestion.resource.id })}
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
            <p>Select a work item or resource to see details.</p>
          )}

          <section className="resource-admin">
            <div className="row">
              <h3>Resources</h3>
              {editingResource ? (
                <button type="button" className="secondary" onClick={cancelResourceEdit}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitResource} className="resource-form">
              <label>
                Name
                <input
                  value={resourceForm.name}
                  onChange={(event) => setResourceForm({ ...resourceForm, name: event.target.value })}
                  placeholder="Avery Chen"
                  required
                />
              </label>
              <label>
                Role
                <input
                  value={resourceForm.role}
                  onChange={(event) => setResourceForm({ ...resourceForm, role: event.target.value })}
                  placeholder="Frontend engineer"
                  required
                />
              </label>
              <div className="grid resource-mini-grid">
                <label>
                  Start
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={resourceForm.workingHours.start}
                    onChange={(event) =>
                      setResourceForm({
                        ...resourceForm,
                        workingHours: { ...resourceForm.workingHours, start: Number(event.target.value) },
                      })
                    }
                  />
                </label>
                <label>
                  End
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={resourceForm.workingHours.end}
                    onChange={(event) =>
                      setResourceForm({
                        ...resourceForm,
                        workingHours: { ...resourceForm.workingHours, end: Number(event.target.value) },
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Color
                <input
                  type="color"
                  value={resourceForm.color}
                  onChange={(event) => setResourceForm({ ...resourceForm, color: event.target.value })}
                />
              </label>
              <div className="skills">
                <span>Skills</span>
                <div>
                  {data.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className={resourceForm.skills.includes(skill) ? 'chip active' : 'chip'}
                      onClick={() => toggleResourceSkill(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
              <button className="primary" type="submit">
                {editingResource ? 'Update resource' : 'Add resource'}
              </button>
            </form>

            <div className="resource-list">
              {data.resources.map((resource) => (
                <button key={resource.id} type="button" className="resource-list-item" onClick={() => beginEditResource(resource)}>
                  <strong>{resource.name}</strong>
                  <span>{resource.role}</span>
                  <small>{skillLabel(resource.skills)} - {resource.workingHours.start}:00 to {resource.workingHours.end}:00</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
