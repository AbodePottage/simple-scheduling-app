import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import type {
  BootstrapResponse,
  Booking,
  Priority,
  Resource,
  ResourceDiscipline,
  ResourceLevel,
  WorkItem,
} from './types';

const priorityOrder: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };
const taskGroupRenderLimit = 8;
const resourceLevelOrder: Record<ResourceLevel, number> = {
  Junior: 1,
  Senior: 2,
  Principal: 3,
  Manager: 4,
};
type Theme = 'light' | 'dark';
type AppPath = '/schedule' | '/tasks' | '/team' | '/add';
type TaskDimension = 'status' | 'priority' | 'skills';
type TaskSort = 'priority' | 'date' | 'name' | 'duration';
type TeamDimension = 'skill' | 'role';
type TeamSort = 'name' | 'role';
type DetailField = {
  label: string;
  value: ReactNode;
};

const validPaths: AppPath[] = ['/schedule', '/tasks', '/team', '/add'];

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

function formatResourceRole(resource: Pick<Resource, 'level' | 'discipline'>) {
  const baseRole = resource.discipline === 'Engineer' ? 'software engineer' : 'data scientist';

  if (resource.level === 'Junior') {
    return baseRole;
  }

  if (resource.level === 'Manager') {
    return `${baseRole} manager`;
  }

  return `${resource.level.toLowerCase()} ${baseRole}`;
}

function DetailTable({ fields, compact = false }: { fields: DetailField[]; compact?: boolean }) {
  return (
    <dl className={compact ? 'detail-table detail-table-compact' : 'detail-table'}>
      {fields.map((field) => (
        <div key={field.label} className="detail-row">
          <dt className="detail-label">{field.label}</dt>
          <dd className="detail-value">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function App() {
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
  const [teamDimension, setTeamDimension] = useState<TeamDimension>('role');
  const [teamFilterValue, setTeamFilterValue] = useState<string>('all');
  const [teamSort, setTeamSort] = useState<TeamSort>('name');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [activeCreatePanel, setActiveCreatePanel] = useState<'work-item' | 'resource'>('work-item');
  const [postSubmitReveal, setPostSubmitReveal] = useState<{ path: '/tasks' | '/team'; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ kind: 'queue' | 'resource'; id?: string } | null>(null);
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
      discipline: 'Engineer' as ResourceDiscipline,
      level: 'Junior' as ResourceLevel,
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
    document.body.classList.toggle('detail-open', Boolean(selectedWorkItemId || selectedResourceId));

    return () => {
      document.body.classList.remove('detail-open');
    };
  }, [selectedResourceId, selectedWorkItemId]);

  useEffect(() => {
    setSelectedWorkItemId(null);
    setSelectedResourceId(null);
    setDropTarget(null);
    setDraggingWorkItemId(null);
    setDraggingBookingId(null);
    if (pathname !== '/add' || (!editingWorkItemId && !editingResourceId)) {
      setEditingWorkItemId(null);
      setForm(blankForm);
      setEditingResourceId(null);
      setResourceForm(blankResourceForm);
    }
  }, [pathname, editingResourceId, editingWorkItemId, blankForm, blankResourceForm]);

  useEffect(() => {
    if (!postSubmitReveal || !data || pathname !== postSubmitReveal.path) {
      return;
    }

    if (postSubmitReveal.path === '/tasks') {
      setSelectedResourceId(null);
      setSelectedWorkItemId(postSubmitReveal.id);
    } else {
      setSelectedWorkItemId(null);
      setSelectedResourceId(postSubmitReveal.id);
    }

    setPostSubmitReveal(null);
  }, [data, pathname, postSubmitReveal]);

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

  const resourceWorkloads = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.resources
      .map((resource) => {
        const bookings = data.bookings.filter((booking) => booking.resourceId === resource.id);

        return {
          resource,
          bookings,
        };
      })
      .sort((a, b) => a.resource.name.localeCompare(b.resource.name));
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
          return (
            priorityOrder[b.priority] - priorityOrder[a.priority] ||
            a.targetDate.localeCompare(b.targetDate) ||
            a.title.localeCompare(b.title)
          );
        case 'date':
          return priorityOrder[b.priority] - priorityOrder[a.priority] || a.targetDate.localeCompare(b.targetDate) || a.title.localeCompare(b.title);
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

  const teamDimensionOptions = useMemo(
    () => [
      { value: 'skill' as TeamDimension, label: 'Skill' },
      { value: 'role' as TeamDimension, label: 'Role' },
    ],
    [],
  );

  const teamValueOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    if (teamDimension === 'role') {
      return [
        { value: 'all', label: 'All' },
        ...(['Junior', 'Senior', 'Principal', 'Manager'] as ResourceLevel[]).map((level) => ({ value: level, label: level })),
      ];
    }

    return [
      { value: 'all', label: 'All' },
      ...Array.from(new Set(data.resources.flatMap((resource) => resource.skills)))
        .sort((a, b) => a.localeCompare(b))
        .map((skill) => ({ value: skill, label: skill })),
    ];
  }, [data, teamDimension]);

  const sortTeamItems = (items: typeof resourceWorkloads) => {
    return [...items].sort((a, b) => {
      switch (teamSort) {
        case 'name':
          return a.resource.name.localeCompare(b.resource.name);
        case 'role':
          return (
            resourceLevelOrder[a.resource.level] - resourceLevelOrder[b.resource.level] ||
            a.resource.name.localeCompare(b.resource.name)
          );
      }
    });
  };

  const teamGroupLabelFor = (entry: (typeof resourceWorkloads)[number]) => {
    if (teamDimension === 'role') {
      return entry.resource.level;
    }

    return entry.resource.skills.length ? entry.resource.skills[0] : 'No skills';
  };

  const teamItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return resourceWorkloads.filter((entry) => {
      if (teamDimension === 'role' && teamFilterValue !== 'all' && entry.resource.level !== teamFilterValue) {
        return false;
      }

      if (teamDimension === 'skill' && teamFilterValue !== 'all' && !entry.resource.skills.includes(teamFilterValue)) {
        return false;
      }

      return true;
    });
  }, [data, resourceWorkloads, teamDimension, teamFilterValue]);

  const teamGroups = useMemo(() => {
    const grouped = new Map<string, typeof resourceWorkloads>();

    teamItems.forEach((entry) => {
      const groupKey = teamGroupLabelFor(entry);
      const list = grouped.get(groupKey) ?? [];
      list.push(entry);
      grouped.set(groupKey, list);
    });

    const order =
      teamDimension === 'role'
        ? ['Junior', 'Senior', 'Principal', 'Manager']
        : undefined;

    const entries = Array.from(grouped.entries()).map(([label, items]) => ({
      label,
      items: sortTeamItems(items),
    }));

    if (!order) {
      return entries.sort((a, b) => a.label.localeCompare(b.label));
    }

    return entries.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }, [resourceWorkloads, sortTeamItems, teamDimension, teamGroupLabelFor, teamItems]);

  const unscheduledWorkItems = useMemo(
      () => visibleWorkItems.filter((item) => item.status === 'unscheduled'),
      [visibleWorkItems],
  );

  const displayedWorkItems = useMemo(() => unscheduledWorkItems.slice(0, 5), [unscheduledWorkItems]);

  const metrics = useMemo(() => {
    const unscheduled = visibleWorkItems.filter((item) => item.status === 'unscheduled').length;
    return [
      { label: 'Team', value: data?.resources.length ?? 0, detail: 'Team members' },
      { label: 'Waiting', value: unscheduled, detail: 'Needs coverage' },
    ];
  }, [data, visibleWorkItems]);

  const selectedWorkItem = selectedWorkItemId ? workItemLookup.get(selectedWorkItemId) ?? null : null;
  const selectedResource = selectedResourceId ? resourceLookup.get(selectedResourceId) ?? null : null;
  const selectedResourceWorkload = useMemo(
    () => (selectedResourceId ? resourceWorkloads.find((entry) => entry.resource.id === selectedResourceId) ?? null : null),
    [resourceWorkloads, selectedResourceId],
  );
  const editingWorkItem = editingWorkItemId ? workItemLookup.get(editingWorkItemId) ?? null : null;
  const editingResource = editingResourceId ? resourceLookup.get(editingResourceId) ?? null : null;

  const navItems = [
    { label: 'Schedule', target: '/schedule' as AppPath },
    { label: 'Team', target: '/team' as AppPath },
    { label: 'Tasks', target: '/tasks' as AppPath },
    { label: 'Add', target: '/add' as AppPath },
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

    const workItem = (await response.json()) as WorkItem;
    setForm(blankForm);
    setEditingWorkItemId(null);
    setActiveCreatePanel('work-item');
    setPostSubmitReveal({ path: '/tasks', id: workItem.id });
    navigate('/tasks');
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
    setSelectedWorkItemId(null);
    setEditingWorkItemId(workItem.id);
    setActiveCreatePanel('work-item');
    setForm({
      title: workItem.title,
      description: workItem.description,
      priority: workItem.priority,
      durationMinutes: workItem.durationMinutes,
      targetDate: workItem.targetDate,
      requiredSkills: [...workItem.requiredSkills],
    });
    navigate('/add');
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

    const resource = (await response.json()) as Resource;
    setResourceForm(blankResourceForm);
    setEditingResourceId(null);
    setActiveCreatePanel('resource');
    setPostSubmitReveal({ path: '/team', id: resource.id });
    navigate('/team');
    await load();
  };

  const beginEditResource = (resource: Resource) => {
    setSelectedWorkItemId(null);
    setSelectedResourceId(resource.id);
    setEditingResourceId(resource.id);
    setActiveCreatePanel('resource');
    setResourceForm({
      name: resource.name,
      discipline: resource.discipline,
      level: resource.level,
      color: resource.color,
      workingHours: { ...resource.workingHours },
      skills: [...resource.skills],
    });
    navigate('/add');
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

  const createComposer = (
    <section className="composer card" id="composer">
      <div className="composer-header">
        <div className="form-switcher" role="tablist" aria-label="Form selection">
          <button
            type="button"
            role="tab"
            aria-selected={activeCreatePanel === 'work-item'}
            className={activeCreatePanel === 'work-item' ? 'secondary active' : 'secondary'}
            onClick={() => setActiveCreatePanel('work-item')}
          >
            Work Item
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCreatePanel === 'resource'}
            className={activeCreatePanel === 'resource' ? 'secondary active' : 'secondary'}
            onClick={() => setActiveCreatePanel('resource')}
          >
            Team
          </button>
        </div>
      </div>

      {activeCreatePanel === 'work-item' ? (
        <form onSubmit={submitWorkItem}>
          <div className="composer-header compact">
            <div>
              <h3>{editingWorkItem ? editingWorkItem.title : 'Add work item'}</h3>
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
              <h3>{editingResource ? editingResource.name : 'Onboard team member'}</h3>
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
              Discipline
              <select
                value={resourceForm.discipline}
                onChange={(event) => setResourceForm({ ...resourceForm, discipline: event.target.value as ResourceDiscipline })}
              >
                <option value="Engineer">Engineer</option>
                <option value="Data scientist">Data scientist</option>
              </select>
            </label>
            <label>
              Level
              <select
                value={resourceForm.level}
                onChange={(event) => setResourceForm({ ...resourceForm, level: event.target.value as ResourceLevel })}
              >
                <option value="Junior">Junior</option>
                <option value="Senior">Senior</option>
                <option value="Principal">Principal</option>
                <option value="Manager">Manager</option>
              </select>
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
            <input type="color" value={resourceForm.color} onChange={(event) => setResourceForm({ ...resourceForm, color: event.target.value })} />
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
  );

  if (pathname !== '/schedule') {
    const pageTitle = pathname === '/tasks' ? 'Tasks' : pathname === '/team' ? 'Team' : 'Add';
    if (pathname === '/team') {
      return (
        <main className="shell">
          <header className="hero card">
            <div className="hero-copy">
              <p className="eyebrow eyebrow-hero">MVP</p>
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

          <section className="card team-page">
            <div className="team-toolbar">
              <div className="task-filters" aria-label="Team filters">
                <label className="task-dimension-filter">
                  <span>Dimension</span>
                  <select
                    value={teamDimension}
                    onChange={(event) => {
                      setTeamDimension(event.target.value as TeamDimension);
                      setTeamFilterValue('all');
                    }}
                  >
                    {teamDimensionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="task-value-group" role="group" aria-label="Team filter values">
                  {teamValueOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={teamFilterValue === option.value ? 'task-filter-chip active' : 'task-filter-chip'}
                      onClick={() => setTeamFilterValue(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="task-dimension-filter task-sort-filter">
                  <span>Sort</span>
                  <select value={teamSort} onChange={(event) => setTeamSort(event.target.value as TeamSort)}>
                    <option value="name">Name</option>
                    <option value="role">Role</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="team-layout">
              <div className="task-groups team-layout-main">
                {teamGroups.map(({ label, items }) => (
                  <section key={label} className="task-group">
                    <div className="task-group-heading">
                      <h3>{label}</h3>
                    </div>

                    <div className="task-list">
                      {items.map(({ resource }) => (
                        <button
                          key={resource.id}
                          type="button"
                          className={selectedResourceId === resource.id ? 'work-item task-item selected' : 'work-item task-item'}
                          style={{ '--card-accent': resource.color } as CSSProperties}
                          onClick={() => toggleResourceSelection(resource.id)}
                        >
                          <div className="task-item-copy">
                            <strong>{resource.name}</strong>
                            <p>{formatResourceRole(resource)}</p>
                          </div>

                          <div className="task-item-chips">
                            {skillOvals(resource.skills)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {selectedResource && selectedResourceWorkload ? (
                <aside
                  className="team-detail-rail"
                  onClick={() => {
                    cancelResourceEdit();
                    setSelectedResourceId(null);
                  }}
                >
                  <section className="task-detail card team-detail" aria-label="Selected teammate" onClick={(event) => event.stopPropagation()}>
                    {editingResourceId === selectedResource.id && editingResource ? (
                      <form onSubmit={submitResource} className="task-edit-form">
                        <div className="team-card-title-row">
                          <strong>Edit teammate</strong>
                          <span className="task-chip task-chip-neutral">{formatResourceRole(editingResource)}</span>
                        </div>

                        <div className="grid">
                          <label>
                            Name
                            <input
                              value={resourceForm.name}
                              onChange={(event) => setResourceForm({ ...resourceForm, name: event.target.value })}
                              required
                            />
                          </label>
                          <label>
                            Discipline
                            <select
                              value={resourceForm.discipline}
                              onChange={(event) =>
                                setResourceForm({ ...resourceForm, discipline: event.target.value as ResourceDiscipline })
                              }
                            >
                              <option value="Engineer">Engineer</option>
                              <option value="Data scientist">Data scientist</option>
                            </select>
                          </label>
                          <label>
                            Level
                            <select
                              value={resourceForm.level}
                              onChange={(event) =>
                                setResourceForm({ ...resourceForm, level: event.target.value as ResourceLevel })
                              }
                            >
                              <option value="Junior">Junior</option>
                              <option value="Senior">Senior</option>
                              <option value="Principal">Principal</option>
                              <option value="Manager">Manager</option>
                            </select>
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
                          <input type="color" value={resourceForm.color} onChange={(event) => setResourceForm({ ...resourceForm, color: event.target.value })} />
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

                        <div className="task-detail-actions">
                          <button type="submit" className="primary">
                            Save changes
                          </button>
                          <button type="button" className="secondary" onClick={cancelResourceEdit}>
                            Cancel edit
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="team-card-title-row">
                          <strong>{selectedResource.name}</strong>
                          <button type="button" className="secondary task-detail-action-inline" onClick={() => beginEditResource(selectedResource)}>
                            Edit teammate
                          </button>
                        </div>
                        <DetailTable
                          fields={[
                            { label: 'Role', value: formatResourceRole(selectedResource) },
                            {
                              label: 'Skills',
                              value: (
                                <div className="task-detail-chip-row">
                                  {selectedResource.skills.length ? (
                                    selectedResource.skills.map((skill) => (
                                      <span key={skill} className="task-chip task-chip-skill">
                                        {skill}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="task-chip task-chip-neutral">No skills</span>
                                  )}
                                </div>
                              ),
                            },
                          ]}
                        />

                        {selectedResourceWorkload.bookings.length ? (
                          <div className="team-bookings">
                            <div className="team-bookings-header">
                              <strong>Booked tasks</strong>
                              <span>{selectedResourceWorkload.bookings.length}</span>
                            </div>
                            {selectedResourceWorkload.bookings.map((booking) => {
                              const workItem = workItemLookup.get(booking.workItemId);
                              return (
                                <div key={booking.id} className="booking-summary">
                                  <strong>{workItem?.title ?? 'Booking'}</strong>
                                  <p>{workItem?.description ?? 'No description available.'}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="empty-state empty-state-inline">
                            <strong>No bookings yet.</strong>
                            <p>This teammate is clear for now.</p>
                          </div>
                        )}

                        <div className="task-detail-actions" />
                      </>
                    )}
                  </section>
                </aside>
              ) : null}
            </div>
          </section>
        </main>
      );
    }

    if (pathname === '/tasks') {
      return (
        <main className="shell">
          <header className="hero card">
            <div className="hero-copy">
              <p className="eyebrow eyebrow-hero">MVP</p>
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

            <div className="task-layout">
              <div className="task-groups task-layout-main">
                {taskGroups.map(({ label, items }) => (
                  <section key={label} className="task-group">
                    <div className="task-group-heading">
                      <h3>{label}</h3>
                    </div>

                    <div className="task-list">
                      {items.slice(0, taskGroupRenderLimit).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={selectedWorkItemId === item.id ? 'work-item task-item selected' : 'work-item task-item'}
                          onClick={() => {
                            toggleWorkItemSelection(item.id);
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
                      {items.length > taskGroupRenderLimit ? (
                        <div className="task-group-more">And {items.length - taskGroupRenderLimit} more.</div>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>

              {selectedWorkItem ? (
                <aside
                  className="task-detail-rail"
                  onClick={() => {
                    cancelEdit();
                    setSelectedWorkItemId(null);
                  }}
                >
                  <section className="task-detail" aria-label="Selected task" onClick={(event) => event.stopPropagation()}>
                    <div className="task-detail-card card">
                      {editingWorkItemId === selectedWorkItem.id && editingWorkItem ? (
                        <form onSubmit={submitWorkItem} className="task-edit-form">
                          <div className="team-card-title-row">
                            <strong>Edit work item</strong>
                            <span className="task-chip task-chip-state" data-state={editingWorkItem.status === 'unscheduled' ? 'open' : 'assigned'}>
                              {editingWorkItem.status === 'unscheduled' ? 'Open' : 'Assigned'}
                            </span>
                          </div>

                          <div className="grid">
                            <label>
                              Title
                              <input
                                value={form.title}
                                onChange={(event) => setForm({ ...form, title: event.target.value })}
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
                              rows={3}
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

                          <div className="task-detail-actions">
                            <button type="submit" className="primary">
                              Save changes
                            </button>
                            <button type="button" className="secondary" onClick={cancelEdit}>
                              Cancel edit
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="team-card-title-row">
                            <strong>{selectedWorkItem.title}</strong>
                            <div className="task-detail-title-actions">
                              <span className="task-chip task-chip-state" data-state={selectedWorkItem.status === 'unscheduled' ? 'open' : 'assigned'}>
                                {selectedWorkItem.status === 'unscheduled' ? 'Open' : 'Assigned'}
                              </span>
                              {selectedWorkItem.status === 'unscheduled' ? (
                                <button type="button" className="secondary task-detail-action-inline" onClick={() => beginEditWorkItem(selectedWorkItem)}>
                                  Edit work item
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <p>{selectedWorkItem.description}</p>
                          <DetailTable
                            fields={[
                              { label: 'Priority', value: selectedWorkItem.priority },
                              { label: 'Duration', value: `${selectedWorkItem.durationMinutes}m` },
                              { label: 'Due date', value: formatTaskDate(selectedWorkItem.targetDate) },
                              {
                                label: 'Booked',
                                value: selectedItemBooking
                                  ? `${resourceLookup.get(selectedItemBooking.resourceId)?.name ?? 'Unknown'} - ${formatClock(selectedItemBooking.startTime)} to ${formatClock(selectedItemBooking.endTime)}`
                                  : 'Not yet scheduled',
                              },
                              {
                                label: 'Skills',
                                value: (
                                  <div className="task-detail-chip-row">
                                    {selectedWorkItem.requiredSkills.length ? (
                                      selectedWorkItem.requiredSkills.map((skill) => (
                                        <span key={skill} className="task-chip task-chip-skill">
                                          {skill}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="task-chip task-chip-neutral">No skills</span>
                                    )}
                                  </div>
                                ),
                              },
                            ]}
                          />

                          <div className="task-detail-actions">
                            {selectedWorkItem.status !== 'unscheduled' ? (
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => void patchWorkItem(selectedWorkItem.id, { assigneeId: null })}
                              >
                                Unassign work item
                              </button>
                            ) : null}
                          </div>

                        </>
                      )}
                    </div>
                  </section>
                </aside>
              ) : null}
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="shell">
        <header className="hero card">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-hero">MVP</p>
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
        {createComposer}
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero card">
        <div className="hero-copy">
          <p className="eyebrow eyebrow-hero">MVP</p>
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
              <DetailTable
                fields={[
                  { label: 'Role', value: formatResourceRole(selectedResource) },
                  {
                    label: 'Skills',
                    value: (
                      <div className="task-detail-chip-row">
                        {selectedResource.skills.length ? (
                          selectedResource.skills.map((skill) => (
                            <span key={skill} className="task-chip task-chip-skill">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="task-chip task-chip-neutral">No skills</span>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
              <button type="button" className="secondary" onClick={() => beginEditResource(selectedResource)}>
                Edit teammate
              </button>
              <div className="resource-bookings">
                {data.bookings.filter((booking) => booking.resourceId === selectedResource.id).map((booking) => {
                  const workItem = workItemLookup.get(booking.workItemId);
                  return (
                    <div key={booking.id} className="booking-summary">
                      <strong>{workItem?.title ?? 'Booking'}</strong>
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
              <h3>{selectedWorkItem.title}</h3>
              <p>{selectedWorkItem.description}</p>
              <DetailTable
                fields={[
                  { label: 'Priority', value: selectedWorkItem.priority },
                  { label: 'Duration', value: `${selectedWorkItem.durationMinutes}m` },
                  { label: 'Due date', value: formatTaskDate(selectedWorkItem.targetDate) },
                  {
                    label: 'Booked',
                    value: selectedItemBooking
                      ? `${resourceLookup.get(selectedItemBooking.resourceId)?.name ?? 'Unknown'} - ${formatClock(selectedItemBooking.startTime)} to ${formatClock(selectedItemBooking.endTime)}`
                      : 'Not yet scheduled',
                  },
                  {
                    label: 'Skills',
                    value: (
                      <div className="task-detail-chip-row">
                        {selectedWorkItem.requiredSkills.length ? (
                          selectedWorkItem.requiredSkills.map((skill) => (
                            <span key={skill} className="task-chip task-chip-skill">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="task-chip task-chip-neutral">No skills</span>
                        )}
                      </div>
                    ),
                  },
                ]}
              />

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

            </>
          ) : (
            <div className="empty-state">
              <strong>Nothing selected.</strong>
              <p>Choose a work item or teammate to inspect details and actions.</p>
            </div>
          )}
        </aside>
      </section>

    </main>
  );
}
