import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { BootstrapResponse, Booking, Resource, Suggestion, WorkItem, Priority } from './types';

const priorityOrder: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };
type Theme = 'light' | 'dark';
type FormPanel = 'work-item' | 'resource';
type AppPath = '/schedule' | '/tasks' | '/team' | '/create';
type TaskDimension = 'status' | 'priority' | 'skills';
type TaskSort = 'priority' | 'date' | 'name' | 'duration';

const validPaths: AppPath[] = ['/schedule', '/tasks', '/team', '/create'];

function normalizePath(pathname: string) {
  return validPaths.includes(pathname as AppPath) ? (pathname as AppPath) : '/schedule';
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function skillLabel(skills: string[]) {
  return skills.length ? skills.join(', ') : 'None';
}

function skillOvals(skills: string[]) {
  if (!skills.length) {
    return <span className="skill-oval muted">General</span>;
  }

  return skills.map((skill) => (
    <span key={skill} className="skill-oval">
      {skill}
    </span>
  ));
}

function formatTaskDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function App() {
  const composerRef = useRef<HTMLElement | null>(null);
  const [pathname, setPathname] = useState<AppPath>(() => normalizePath(window.location.pathname));
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editingWorkItemId, setEditingWorkItemId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [taskDimension, setTaskDimension] = useState<TaskDimension>('status');
  const [taskFilterValue, setTaskFilterValue] = useState<string>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('priority');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [activeFormPanel, setActiveFormPanel] = useState<FormPanel>('work-item');
  const [dropTarget, setDropTarget] = useState<{ kind: 'queue' | 'resource'; id?: string } | null>(null);
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

  const navigate = (path: AppPath) => {
    const nextPath = normalizePath(path);
    if (nextPath === pathname) {
      return;
    }

    window.history.pushState({}, '', nextPath);
    setPathname(nextPath);
  };

  const load = async () => {
    const response = await fetch('/api/bootstrap');
    setData((await response.json()) as BootstrapResponse);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPathname(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/schedule');
      setPathname('/schedule');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  useEffect(() => {
    if (editingWorkItemId || editingResourceId) {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingWorkItemId, editingResourceId, activeFormPanel]);

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

  const taskDimensionOptions = useMemo(
    () => [
      { value: 'status' as TaskDimension, label: 'Status' },
      { value: 'priority' as TaskDimension, label: 'Priority' },
      { value: 'skills' as TaskDimension, label: 'Skills' },
    ],
    [],
  );

  const taskValueOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    if (taskDimension === 'status') {
      return [
        { value: 'all', label: 'All' },
        { value: 'open', label: 'Open' },
        { value: 'assigned', label: 'Assigned' },
      ];
    }

    if (taskDimension === 'priority') {
      return [
        { value: 'all', label: 'All' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
      ];
    }

    const skills = new Set<string>();
    data.workItems.forEach((item) => item.requiredSkills.forEach((skill) => skills.add(skill)));
    return [{ value: 'all', label: 'All' }, ...Array.from(skills).map((skill) => ({ value: skill, label: skill }))];
  }, [data, taskDimension]);

  const sortTaskItems = (items: WorkItem[]) => {
    return [...items].sort((a, b) => {
      switch (taskSort) {
        case 'priority':
          return priorityOrder[b.priority] - priorityOrder[a.priority] || a.title.localeCompare(b.title);
        case 'date':
          return a.targetDate.localeCompare(b.targetDate) || a.title.localeCompare(b.title);
        case 'name':
          return a.title.localeCompare(b.title);
        case 'duration':
          return b.durationMinutes - a.durationMinutes || a.title.localeCompare(b.title);
      }
    });
  };

  const groupLabelFor = (item: WorkItem) => {
    if (taskDimension === 'status') {
      return item.status === 'unscheduled' ? 'Open' : 'Assigned';
    }

    if (taskDimension === 'priority') {
      return item.priority;
    }

    return item.requiredSkills.length ? item.requiredSkills[0] : 'No skills';
  };

  const taskItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.workItems.filter((item) => {
      if (taskDimension === 'status' && taskFilterValue !== 'all') {
        const isOpen = item.status === 'unscheduled';
        if (taskFilterValue === 'open' && !isOpen) {
          return false;
        }

        if (taskFilterValue === 'assigned' && isOpen) {
          return false;
        }
      }

      if (taskDimension === 'priority' && taskFilterValue !== 'all' && item.priority !== taskFilterValue) {
        return false;
      }

      if (taskDimension === 'skills' && taskFilterValue !== 'all' && !item.requiredSkills.includes(taskFilterValue)) {
        return false;
      }

      return true;
    });
  }, [data, taskDimension, taskFilterValue]);

  const taskGroups = useMemo(() => {
    const grouped = new Map<string, WorkItem[]>();

    taskItems.forEach((item) => {
      const groupKey = groupLabelFor(item);

      const list = grouped.get(groupKey) ?? [];
      list.push(item);
      grouped.set(groupKey, list);
    });

    const order =
      taskDimension === 'status'
        ? ['Open', 'Assigned']
        : taskDimension === 'priority'
          ? ['High', 'Medium', 'Low']
          : undefined;

    const entries = Array.from(grouped.entries()).map(([label, items]) => ({
      label,
      items: sortTaskItems(items),
    }));

    if (!order) {
      return entries.sort((a, b) => a.label.localeCompare(b.label));
    }

    return entries.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }, [groupLabelFor, sortTaskItems, taskDimension, taskItems]);

  const unscheduledWorkItems = useMemo(
      () => visibleWorkItems.filter((item) => item.status === 'unscheduled'),
      [visibleWorkItems],
  );

  const displayedWorkItems = useMemo(() => unscheduledWorkItems.slice(0, 5), [unscheduledWorkItems]);

  const metrics = useMemo(() => {
    const unscheduled = visibleWorkItems.filter((item) => item.status === 'unscheduled').length;
    const booked = data ? data.workItems.length - unscheduled : 0;
    return [
      { label: 'Team', value: data?.resources.length ?? 0, detail: 'Available people' },
      { label: 'Booked', value: booked, detail: 'Assigned tasks' },
      { label: 'Waiting', value: unscheduled, detail: 'Needs coverage' },
    ];
  }, [data, visibleWorkItems]);

  const selectedWorkItem = selectedWorkItemId ? workItemLookup.get(selectedWorkItemId) ?? null : null;
  const selectedResource = selectedResourceId ? resourceLookup.get(selectedResourceId) ?? null : null;
  const editingWorkItem = editingWorkItemId ? workItemLookup.get(editingWorkItemId) ?? null : null;
  const editingResource = editingResourceId ? resourceLookup.get(editingResourceId) ?? null : null;

  const navItems = [
    { label: 'Schedule', target: '/schedule' as AppPath },
    { label: 'Team', target: '/team' as AppPath },
    { label: 'Tasks', target: '/tasks' as AppPath },
    { label: 'Create', target: '/create' as AppPath },
  ];

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
    setActiveFormPanel('work-item');
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
    setActiveFormPanel('resource');
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

  const resetSelectionAndForms = () => {
    setSelectedWorkItemId(null);
    setSelectedResourceId(null);
    setEditingWorkItemId(null);
    setEditingResourceId(null);
    setActiveFormPanel('work-item');
    setForm(blankForm);
    setResourceForm(blankResourceForm);
  };

  const toggleWorkItemSelection = (workItemId: string) => {
    if (selectedWorkItemId === workItemId) {
      resetSelectionAndForms();
      return;
    }

    setSelectedResourceId(null);
    setSelectedWorkItemId(workItemId);
  };

  const toggleResourceSelection = (resourceId: string) => {
    if (selectedResourceId === resourceId) {
      resetSelectionAndForms();
      return;
    }

    setSelectedWorkItemId(null);
    setSelectedResourceId(resourceId);
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
    setDropTarget(null);
  };

  const selectedItemBooking = selectedWorkItem?.bookingId
    ? data?.bookings.find((booking) => booking.id === selectedWorkItem.bookingId) ?? null
    : null;

  if (!data) {
    return <main className="shell">Loading scheduling board...</main>;
  }

  if (pathname !== '/schedule') {
    const pageTitle = pathname === '/tasks' ? 'Tasks' : pathname === '/team' ? 'Team' : 'Create';
    if (pathname === '/tasks') {
      return (
        <main className="shell">
          <header className="hero card">
            <div className="hero-copy">
              <p className="eyebrow eyebrow-hero">Simple scheduling app</p>
              <h1>{pageTitle}</h1>
              <nav className="hero-nav" aria-label="Page sections">
                {navItems.map((item) => (
                  <button
                    key={item.target}
                    type="button"
                    className={item.target === pathname ? 'hero-nav-pill active' : 'hero-nav-pill'}
                    onClick={() => navigate(item.target)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="hero-actions">
              <button
                type="button"
                className="secondary theme-toggle"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>
            </div>
          </header>

          <section className="card tasks-page">
            <div className="tasks-toolbar">
              <div className="section-heading tasks-heading" />

              <div className="task-filters" aria-label="Task filters">
                <label className="task-dimension-filter">
                  <span>Dimension</span>
                  <select
                    value={taskDimension}
                    onChange={(event) => {
                      setTaskDimension(event.target.value as TaskDimension);
                      setTaskFilterValue('all');
                    }}
                  >
                    {taskDimensionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="task-value-group" aria-label="Task values">
                  {taskValueOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={taskFilterValue === option.value ? 'task-filter-chip active' : 'task-filter-chip'}
                      onClick={() => setTaskFilterValue(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="task-dimension-filter task-sort-filter">
                  <span>Sort</span>
                  <select value={taskSort} onChange={(event) => setTaskSort(event.target.value as TaskSort)}>
                    <option value="priority">Priority</option>
                    <option value="date">Due date</option>
                    <option value="name">Name</option>
                    <option value="duration">Duration</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="task-groups">
              {taskGroups.map(({ label, items }) => (
                <section key={label} className="task-group">
                  <div className="task-group-heading">
                    <h3>{label}</h3>
                    <span>{items.length}</span>
                  </div>

                  <div className="task-list">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="work-item task-item"
                        onClick={() => {
                          toggleWorkItemSelection(item.id);
                          navigate('/schedule');
                        }}
                      >
                        <div className="task-item-copy">
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </div>

                        <div className="task-item-chips">
                          <span className="task-chip task-chip-state" data-state={item.status === 'unscheduled' ? 'open' : 'assigned'}>
                            {item.status === 'unscheduled' ? 'Open' : 'Assigned'}
                          </span>
                          <span className="task-chip task-chip-priority" data-priority={item.priority}>
                            {item.priority}
                          </span>
                          <span className="task-chip task-chip-neutral">{item.durationMinutes}m</span>
                          <span className="task-chip task-chip-neutral">{formatTaskDate(item.targetDate)}</span>
                          {item.requiredSkills.length ? (
                            item.requiredSkills.map((skill) => (
                              <span key={skill} className="task-chip task-chip-skill">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="task-chip task-chip-neutral">No skills</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="shell">
        <header className="hero card">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-hero">Simple scheduling app</p>
            <h1>{pageTitle}</h1>
            <nav className="hero-nav" aria-label="Page sections">
              {navItems.map((item) => (
                <button
                  key={item.target}
                  type="button"
                  className={item.target === pathname ? 'hero-nav-pill active' : 'hero-nav-pill'}
                  onClick={() => navigate(item.target)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary theme-toggle"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>
          </div>
        </header>
        <section className="page-placeholder card">
          <h2>{pageTitle} page</h2>
          <h2>{pageTitle} page</h2>
          <button type="button" className="primary" onClick={() => navigate('/schedule')}>
            Back to schedule
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero card">
        <div className="hero-copy">
          <p className="eyebrow eyebrow-hero">Simple scheduling app</p>
          <h1>Assign work fast</h1>
          <nav className="hero-nav" aria-label="Page sections">
            {navItems.map((item) => (
              <button
                key={item.target}
                type="button"
                className={item.target === pathname ? 'hero-nav-pill active' : 'hero-nav-pill'}
                onClick={() => navigate(item.target)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="hero-actions">
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

          <button
            type="button"
            className="secondary theme-toggle"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </header>

      <section className="overview" aria-label="Scheduling summary">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card card">
            <h2 className="metric-label">{metric.label}</h2>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-detail">{metric.detail}</span>
          </article>
        ))}
      </section>

      <section className="workspace">
        <div className="rail" id="people-queue">
          <aside
            className={dropTarget?.kind === 'queue' ? 'card queue drop-target' : 'card queue'}
            id="queue"
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => {
              if (draggingWorkItemId || draggingBookingId) {
                setDropTarget({ kind: 'queue' });
              }
            }}
            onDragLeave={() => {
              if (dropTarget?.kind === 'queue') {
                setDropTarget(null);
              }
            }}
            onDrop={() => {
              void handleQueueDrop();
            }}
          >
            <div className="section-heading">
              <h2>Tasks</h2>
            </div>
            {displayedWorkItems.length ? (
              displayedWorkItems.map((item) => (
                <article
                  key={item.id}
                  className={[
                    'work-item',
                    selectedWorkItemId === item.id ? 'selected' : '',
                    draggingWorkItemId === item.id ? 'dragging' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  draggable
                  onDragStart={() => {
                    setDraggingBookingId(null);
                    setDraggingWorkItemId(item.id);
                  }}
                  onDragEnd={() => {
                    setDraggingWorkItemId(null);
                    setDraggingBookingId(null);
                    setDropTarget(null);
                  }}
                  onClick={() => {
                    toggleWorkItemSelection(item.id);
                  }}
                >
                  <div className="row">
                    <strong>{item.title}</strong>
                    <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
                  </div>
                  <p>{item.description}</p>
                  <small>{item.durationMinutes} min - {skillLabel(item.requiredSkills)}</small>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nothing is waiting.</strong>
                <p>Every work item is scheduled. Drag something back here to unassign it.</p>
              </div>
            )}
          </aside>

          <aside className="card resource-list-panel" id="people">
            <div className="section-heading">
              <h2>Team</h2>
            </div>
            <div className="resource-list">
              {data.resources.map((resource) => (
                <button key={resource.id} type="button" className="resource-list-item" onClick={() => toggleResourceSelection(resource.id)}>
                  <div className="resource-list-item-top">
                    <span className="color-swatch" style={{ backgroundColor: resource.color }} />
                    <div>
                      <strong>{resource.name}</strong>
                      <span className="resource-role">{resource.role}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <section className="board" id="board">
          <div className="board-header">
            <div>
              <h2>Schedule</h2>
            </div>
          </div>

          <div className="resource-grid">
            {visibleResources.map((resource) => {
              const bookings = data.bookings.filter((booking) => booking.resourceId === resource.id);
              return (
                <div
                  key={resource.id}
                  className={dropTarget?.kind === 'resource' && dropTarget.id === resource.id ? 'resource-row drop-target' : 'resource-row'}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnter={() => {
                    if (draggingWorkItemId || draggingBookingId) {
                      setDropTarget({ kind: 'resource', id: resource.id });
                    }
                  }}
                  onDragLeave={() => {
                    if (dropTarget?.kind === 'resource' && dropTarget.id === resource.id) {
                      setDropTarget(null);
                    }
                  }}
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
                    setDropTarget(null);
                  }}
                >
                  <button
                    type="button"
                    className={selectedResourceId === resource.id ? 'resource-card selected' : 'resource-card'}
                    style={{ '--card-accent': resource.color } as CSSProperties}
                    onClick={() => {
                      toggleResourceSelection(resource.id);
                    }}
                  >
                    <div className="resource-card-top">
                      <span className="color-swatch" style={{ backgroundColor: resource.color }} />
                      <strong>{resource.name}</strong>
                    </div>
                    <div className="skill-ovals">{skillOvals(resource.skills)}</div>
                  </button>
                  <div className="booking-strip">
                    {!bookings.length ? (
                      <div className="empty-state empty-state-inline">
                        <strong>Open slot</strong>
                        <p>Drop work here to book {resource.name}.</p>
                      </div>
                    ) : null}
                    {bookings.map((booking) => {
                      const workItem = workItemLookup.get(booking.workItemId);
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          className={[
                            'booking-card',
                            draggingBookingId === booking.id ? 'dragging' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{ '--card-accent': resource.color } as CSSProperties}
                          draggable
                          onDragStart={() => {
                            setDraggingWorkItemId(null);
                            setDraggingBookingId(booking.id);
                          }}
                          onDragEnd={() => {
                            setDraggingWorkItemId(null);
                            setDraggingBookingId(null);
                            setDropTarget(null);
                          }}
                          onClick={() => {
                            toggleWorkItemSelection(booking.workItemId);
                          }}
                        >
                          <strong>{workItem?.title ?? 'Booking'}</strong>
                          <div className="skill-ovals">{skillOvals(workItem?.requiredSkills ?? [])}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="card inspector" id="details">
          <div className="section-heading">
            <h2>Details</h2>
          </div>
          {selectedResource ? (
            <>
              <h3>{selectedResource.name}</h3>
              <div className="detail-pills">
                <span className="detail-pill">{selectedResource.role}</span>
                <span className="detail-pill">
                  {selectedResource.workingHours.start}:00 - {selectedResource.workingHours.end}:00
                </span>
                <span className="detail-pill">{skillLabel(selectedResource.skills)}</span>
              </div>
              <button type="button" className="secondary" onClick={() => beginEditResource(selectedResource)}>
                Edit teammate
              </button>
              <div className="resource-bookings">
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
              <p className="section-copy">Priority is {selectedWorkItem.priority.toLowerCase()}.</p>
              <h3>{selectedWorkItem.title}</h3>
              <p>{selectedWorkItem.description}</p>
              <div className="detail-pills">
                <span className="detail-pill">{selectedWorkItem.durationMinutes} min</span>
                <span className="detail-pill">{selectedWorkItem.status}</span>
                <span className="detail-pill">{skillLabel(selectedWorkItem.requiredSkills)}</span>
              </div>

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
                {!suggestions.length ? (
                  <div className="empty-state empty-state-inline">
                    <strong>No suggestions yet.</strong>
                    <p>Select a work item with required skills to see matches.</p>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Nothing selected.</strong>
              <p>Choose a work item or teammate to inspect details and actions.</p>
            </div>
          )}
        </aside>
      </section>

      <section className="composer card" ref={composerRef} id="composer">
        <div className="composer-header">
          <div>
            <h2>Create</h2>
          </div>
          <div className="form-switcher" role="tablist" aria-label="Form selection">
            <button
              type="button"
              role="tab"
              aria-selected={activeFormPanel === 'work-item'}
              className={activeFormPanel === 'work-item' ? 'secondary active' : 'secondary'}
              onClick={() => setActiveFormPanel('work-item')}
            >
              Work item
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFormPanel === 'resource'}
              className={activeFormPanel === 'resource' ? 'secondary active' : 'secondary'}
              onClick={() => setActiveFormPanel('resource')}
            >
              Teammate
            </button>
          </div>
        </div>

        {activeFormPanel === 'work-item' ? (
          <form onSubmit={submitWorkItem}>
            <div className="composer-header compact">
              <div>
                <h3>{editingWorkItem ? editingWorkItem.title : 'New work item'}</h3>
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
        ) : (
          <form onSubmit={submitResource}>
            <div className="composer-header compact">
              <div>
                <h3>{editingResource ? editingResource.name : 'Add teammate'}</h3>
              </div>
              {editingResource ? (
                <button type="button" className="secondary" onClick={cancelResourceEdit}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="grid">
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
              {editingResource ? 'Update teammate' : 'Add teammate'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
