import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Calendar, CheckCircle2, ClipboardList, Home, Moon, Sun, Users } from 'lucide-react';
import { fetchResources, fetchWorkItems, type Page } from './api';
import { Pagination } from './Pagination';
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
type Theme = 'light' | 'dark';
type AppPath = '/' | '/schedule' | '/tasks' | '/team';
type TaskDimension = 'status' | 'priority' | 'skills';
type TaskSort = 'priority' | 'date' | 'name' | 'duration';
const sortDefaultDirection: Record<TaskSort, 'asc' | 'desc'> = {
  priority: 'desc',
  date: 'asc',
  name: 'asc',
  duration: 'desc',
};
type DetailField = {
  label: string;
  value: ReactNode;
};

const validPaths: AppPath[] = ['/', '/schedule', '/tasks', '/team'];

function normalizePath(pathname: string) {
  return validPaths.includes(pathname as AppPath) ? (pathname as AppPath) : '/';
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function skillLabel(skills: string[]) {
  return skills.length ? skills.join(', ') : 'None';
}

function formatTaskDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function scheduleAccent(targetDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return 'hsl(8 88% 52%)';
  }

  if (diffDays === 0) {
    return 'hsl(16 92% 54%)';
  }

  if (diffDays <= 2) {
    return 'hsl(38 92% 52%)';
  }

  if (diffDays <= 5) {
    return 'hsl(96 60% 44%)';
  }

  if (diffDays <= 10) {
    return 'hsl(164 56% 40%)';
  }

  return 'hsl(214 72% 48%)';
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
  const [workItemQuery, setWorkItemQuery] = useState<string>('');
  const [taskDimension, setTaskDimension] = useState<TaskDimension>('status');
  const [taskFilterValues, setTaskFilterValues] = useState<string[]>([]);
  const [taskSort, setTaskSort] = useState<TaskSort>('priority');
  const [taskSortDirection, setTaskSortDirection] = useState<'asc' | 'desc'>('desc');
  const [backlogDimension, setBacklogDimension] = useState<'priority' | 'skills'>('priority');
  const [backlogFilterValues, setBacklogFilterValues] = useState<string[]>([]);
  const [tasksPageNum, setTasksPageNum] = useState<number>(1);
  const [tasksPage, setTasksPage] = useState<Page<WorkItem>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [engineersPageNum, setEngineersPageNum] = useState<number>(1);
  const [engineersPage, setEngineersPage] = useState<Page<Resource>>({ items: [], total: 0, page: 1, pageSize: 8 });
  const [scientistsPageNum, setScientistsPageNum] = useState<number>(1);
  const [scientistsPage, setScientistsPage] = useState<Page<Resource>>({ items: [], total: 0, page: 1, pageSize: 8 });
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [creating, setCreating] = useState<'work-item' | 'resource' | null>(null);
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
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  const navigate = (path: AppPath) => {
    const nextPath = normalizePath(path);
    if (nextPath === pathname) {
      return;
    }

    window.history.pushState({}, '', nextPath);
    setPathname(nextPath);
  };

  useEffect(() => {
    if (pathname === '/schedule' && pendingScrollId) {
      document.getElementById(pendingScrollId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScrollId(null);
    }
  }, [pathname, pendingScrollId]);

  const navigateToTasksFiltered = (status: 'open' | 'assigned') => {
    setTaskDimension('status');
    setTaskFilterValues([status]);
    setTasksPageNum(1);
    navigate('/tasks');
  };

  const load = async () => {
    const response = await fetch('/api/bootstrap');
    setData((await response.json()) as BootstrapResponse);
  };

  useEffect(() => {
    void load();
  }, []);

  const taskQueryParams = useMemo(() => {
    const params = {
      page: tasksPageNum,
      pageSize: 10,
      sort: taskSort,
      sortDir: taskSortDirection,
      status: 'all',
      priority: 'all',
      skill: 'all',
    };
    if (taskFilterValues.length > 0) {
      if (taskDimension === 'status') {
        params.status = taskFilterValues.join(',');
      } else if (taskDimension === 'priority') {
        params.priority = taskFilterValues.join(',');
      } else if (taskDimension === 'skills') {
        params.skill = taskFilterValues.join(',');
      }
    }
    return params;
  }, [tasksPageNum, taskSort, taskSortDirection, taskDimension, taskFilterValues]);

  useEffect(() => {
    let cancelled = false;
    void fetchWorkItems(taskQueryParams).then((result) => {
      if (cancelled) {
        return;
      }
      setTasksPage(result);
      if (result.page !== tasksPageNum) {
        setTasksPageNum(result.page);
      }
    });
    return () => {
      cancelled = true;
    };
    // data is a dep so the page refetches after create/edit reloads bootstrap.
  }, [taskQueryParams, data]);

  useEffect(() => {
    let cancelled = false;
    void fetchResources({ page: engineersPageNum, pageSize: 8, discipline: 'Engineer' }).then((result) => {
      if (cancelled) {
        return;
      }
      setEngineersPage(result);
      if (result.page !== engineersPageNum) {
        setEngineersPageNum(result.page);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [engineersPageNum, data]);

  useEffect(() => {
    let cancelled = false;
    void fetchResources({ page: scientistsPageNum, pageSize: 8, discipline: 'Data scientist' }).then((result) => {
      if (cancelled) {
        return;
      }
      setScientistsPage(result);
      if (result.page !== scientistsPageNum) {
        setScientistsPageNum(result.page);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scientistsPageNum, data]);

  useEffect(() => {
    const onPopState = () => {
      setPathname(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle('detail-open', Boolean(selectedWorkItemId || selectedResourceId || creating));

    return () => {
      document.body.classList.remove('detail-open');
    };
  }, [selectedResourceId, selectedWorkItemId, creating]);

  useEffect(() => {
    setSelectedWorkItemId(null);
    setSelectedResourceId(null);
    setDropTarget(null);
    setDraggingWorkItemId(null);
    setDraggingBookingId(null);
    setCreating(null);
    setEditingWorkItemId(null);
    setForm(blankForm);
    setEditingResourceId(null);
    setResourceForm(blankResourceForm);
  }, [pathname, blankForm, blankResourceForm]);

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

  const bookingsByResourceId = useMemo(() => {
    const map = new Map<string, Booking[]>();
    data?.bookings.forEach((booking) => {
      const list = map.get(booking.resourceId) ?? [];
      list.push(booking);
      map.set(booking.resourceId, list);
    });
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

  const visibleResources = useMemo(() => {
    if (!data) {
      return [];
    }

    if (backlogDimension !== 'skills' || backlogFilterValues.length === 0) {
      return data.resources;
    }

    return data.resources.filter((resource) => backlogFilterValues.every((skill) => resource.skills.includes(skill)));
  }, [data, backlogDimension, backlogFilterValues]);

  const visibleWorkItems = useMemo(() => data?.workItems ?? [], [data]);

  const backlogItems = useMemo(() => {
    const query = workItemQuery.trim().toLowerCase();
    const filtered = visibleWorkItems.filter((item) => {
      if (item.status !== 'unscheduled') {
        return false;
      }

      if (
        backlogDimension === 'priority' &&
        backlogFilterValues.length > 0 &&
        !backlogFilterValues.includes(item.priority)
      ) {
        return false;
      }
      if (
        backlogDimension === 'skills' &&
        backlogFilterValues.length > 0 &&
        !backlogFilterValues.every((skill) => item.requiredSkills.includes(skill))
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [item.title, item.description, item.priority, item.targetDate, ...item.requiredSkills]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    const dir = taskSortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (taskSort) {
        case 'priority':
          return (
            dir * (priorityOrder[a.priority] - priorityOrder[b.priority]) ||
            a.targetDate.localeCompare(b.targetDate) ||
            a.title.localeCompare(b.title)
          );
        case 'date':
          return dir * a.targetDate.localeCompare(b.targetDate) || priorityOrder[b.priority] - priorityOrder[a.priority] || a.title.localeCompare(b.title);
        case 'name':
          return dir * a.title.localeCompare(b.title);
        case 'duration':
          return dir * (a.durationMinutes - b.durationMinutes) || a.title.localeCompare(b.title);
      }
    });
  }, [visibleWorkItems, taskSort, taskSortDirection, workItemQuery, backlogDimension, backlogFilterValues]);

  const visibleBacklogItems = useMemo(
    () => backlogItems.slice(0, taskGroupRenderLimit * 2),
    [backlogItems],
  );

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

  const backlogDimensionOptions = useMemo(
    () => [
      { value: 'priority' as const, label: 'Priority' },
      { value: 'skills' as const, label: 'Skills' },
    ],
    [],
  );

  const backlogValueOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    if (backlogDimension === 'priority') {
      return [
        { value: 'all', label: 'All' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
      ];
    }

    return [{ value: 'all', label: 'All' }, ...data.skills.map((skill) => ({ value: skill, label: skill }))];
  }, [data, backlogDimension]);

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
  const hasScheduleDetails = Boolean(selectedResource || selectedWorkItem);

  const homeIconButton = (
    <button type="button" className="secondary home-icon-btn" aria-label="Go to home" onClick={() => navigate('/')}>
      <Home size={18} aria-hidden="true" />
    </button>
  );

  const submitWorkItem = async (event: FormEvent) => {
    event.preventDefault();

    const wasEditing = Boolean(editingWorkItemId);
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
    await load();

    if (wasEditing) {
      setEditingWorkItemId(null);
      setSelectedResourceId(null);
      setSelectedWorkItemId(workItem.id);
    } else {
      setCreating(null);
      if (pathname === '/tasks' || pathname === '/schedule') {
        setSelectedResourceId(null);
        setSelectedWorkItemId(workItem.id);
      }
    }
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

  const openCreateWorkItem = () => {
    setSelectedWorkItemId(null);
    setSelectedResourceId(null);
    setEditingWorkItemId(null);
    setEditingResourceId(null);
    setForm(blankForm);
    setCreating('work-item');
  };

  const beginEditWorkItem = (workItem: WorkItem) => {
    setCreating(null);
    setSelectedResourceId(null);
    setSelectedWorkItemId(workItem.id);
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

  const dismissWorkItemForm = () => {
    if (creating === 'work-item') {
      setCreating(null);
    }
    setEditingWorkItemId(null);
    setForm(blankForm);
  };

  const submitResource = async (event: FormEvent) => {
    event.preventDefault();

    const wasEditing = Boolean(editingResourceId);
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
    await load();

    if (wasEditing) {
      setEditingResourceId(null);
      setSelectedWorkItemId(null);
      setSelectedResourceId(resource.id);
    } else {
      setCreating(null);
      if (pathname === '/team' || pathname === '/schedule') {
        setSelectedWorkItemId(null);
        setSelectedResourceId(resource.id);
      }
    }
  };

  const openCreateResource = () => {
    setSelectedWorkItemId(null);
    setSelectedResourceId(null);
    setEditingWorkItemId(null);
    setEditingResourceId(null);
    setResourceForm(blankResourceForm);
    setCreating('resource');
  };

  const beginEditResource = (resource: Resource) => {
    setCreating(null);
    setSelectedWorkItemId(null);
    setSelectedResourceId(resource.id);
    setEditingResourceId(resource.id);
    setResourceForm({
      name: resource.name,
      discipline: resource.discipline,
      level: resource.level,
      color: resource.color,
      workingHours: { ...resource.workingHours },
      skills: [...resource.skills],
    });
  };

  const cancelResourceEdit = () => {
    setEditingResourceId(null);
    setResourceForm(blankResourceForm);
  };

  const dismissResourceForm = () => {
    if (creating === 'resource') {
      setCreating(null);
    }
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

  const groupBookingsByStart = (bookings: Booking[]) => {
    const sorted = [...bookings].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime() || new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
    );
    const groups: Array<{ startTime: string; bookings: Booking[] }> = [];

    sorted.forEach((booking) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.startTime === booking.startTime) {
        lastGroup.bookings.push(booking);
        return;
      }

      groups.push({ startTime: booking.startTime, bookings: [booking] });
    });

    return groups;
  };

  if (!data) {
    return <main className="shell">Loading scheduling board...</main>;
  }

  const workItemFormCard = (
    <form onSubmit={submitWorkItem} className="task-edit-form">
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

          <div className="task-detail-actions">
            <button className="primary" type="submit">
              {editingWorkItem ? 'Save changes' : 'Add work item'}
            </button>
            <button type="button" className="secondary" onClick={dismissWorkItemForm}>
              {editingWorkItem ? 'Cancel edit' : 'Cancel'}
            </button>
          </div>
    </form>
  );

  const resourceFormCard = (
    <form onSubmit={submitResource} className="task-edit-form">
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
            <label>
              Color
              <input type="color" value={resourceForm.color} onChange={(event) => setResourceForm({ ...resourceForm, color: event.target.value })} />
            </label>
          </div>

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
            <button className="primary" type="submit">
              {editingResource ? 'Save changes' : 'Add teammate'}
            </button>
            <button type="button" className="secondary" onClick={dismissResourceForm}>
              {editingResource ? 'Cancel edit' : 'Cancel'}
            </button>
          </div>
    </form>
  );

  const composerRail = creating ? (
    <aside className="task-detail-rail" onClick={() => setCreating(null)}>
      <section
        className="task-detail"
        aria-label={creating === 'work-item' ? 'New work item' : 'New teammate'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-detail-card card">{creating === 'work-item' ? workItemFormCard : resourceFormCard}</div>
      </section>
    </aside>
  ) : null;

  const today = new Date().toISOString().slice(0, 10);
  const openWorkItems = data.workItems.filter((item) => item.status === 'unscheduled').length;
  const assignedWorkItems = data.workItems.length - openWorkItems;
  const todaysBookings = data.bookings.filter(
    (booking) => booking.status !== 'canceled' && booking.startTime.slice(0, 10) === today,
  ).length;
  const homeStats = [
    {
      label: "Today's bookings",
      value: todaysBookings,
      icon: Calendar,
      onSelect: () => {
        navigate('/schedule');
        setPendingScrollId('board');
      },
    },
    {
      label: 'Assigned work items',
      value: assignedWorkItems,
      icon: CheckCircle2,
      onSelect: () => navigateToTasksFiltered('assigned'),
    },
    {
      label: 'Open work items',
      value: openWorkItems,
      icon: ClipboardList,
      onSelect: () => navigateToTasksFiltered('open'),
    },
    {
      label: 'Teammates',
      value: data.resources.length,
      icon: Users,
      onSelect: () => navigate('/team'),
    },
  ];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (pathname !== '/schedule') {
    const pageTitle = pathname === '/tasks' ? 'Clear the backlog' : pathname === '/team' ? 'Meet the team' : 'Welcome back!';
    if (pathname === '/team') {
      return (
        <main className="shell">
          <header className="hero card">
            {homeIconButton}
            <div className="hero-copy">
              <h1>{pageTitle}</h1>
            </div>

            <div className="hero-actions">
              <button type="button" className="primary hero-cta" onClick={openCreateResource}>
                New team member
              </button>
              <button
                type="button"
                className="secondary theme-toggle"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
              </button>
            </div>
          </header>

          <section className="card team-page">
            <div className="team-layout">
              <div className="team-columns team-layout-main">
                {[
                  { label: 'Engineers', page: engineersPage, noun: 'engineers', onPageChange: setEngineersPageNum },
                  { label: 'Data scientists', page: scientistsPage, noun: 'data scientists', onPageChange: setScientistsPageNum },
                ].map(({ label, page, noun, onPageChange }) => (
                  <section key={label} className="task-group team-column">
                    <div className="task-group-heading">
                      <h3>{label}</h3>
                    </div>

                    <div className="task-list">
                      {page.items.map((resource) => (
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
                        </button>
                      ))}
                    </div>

                    <Pagination
                      page={page.page}
                      pageSize={page.pageSize}
                      total={page.total}
                      itemCount={page.items.length}
                      noun={noun}
                      onPageChange={onPageChange}
                    />
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
                    {editingResourceId === selectedResource.id ? (
                      resourceFormCard
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
                              value: selectedResource.skills.length ? (
                                <div className="detail-skill-chips">
                                  {selectedResource.skills.map((skill) => (
                                    <span key={skill} className="task-chip task-chip-skill">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                'No skills listed'
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
          {composerRail}
        </main>
      );
    }

    if (pathname === '/tasks') {
      return (
        <main className="shell">
          <header className="hero card">
            {homeIconButton}
            <div className="hero-copy">
              <h1>{pageTitle}</h1>
            </div>

            <div className="hero-actions">
              <button type="button" className="primary hero-cta" onClick={openCreateWorkItem}>
                New work item
              </button>
              <button
                type="button"
                className="secondary theme-toggle"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
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
                      setTaskFilterValues([]);
                      setTasksPageNum(1);
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
                  {taskValueOptions.map((option) => {
                    const isActive =
                      option.value === 'all' ? taskFilterValues.length === 0 : taskFilterValues.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={isActive ? 'task-filter-chip active' : 'task-filter-chip'}
                        onClick={() => {
                          if (option.value === 'all') {
                            setTaskFilterValues([]);
                          } else {
                            setTaskFilterValues((current) =>
                              current.includes(option.value)
                                ? current.filter((value) => value !== option.value)
                                : [...current, option.value],
                            );
                          }
                          setTasksPageNum(1);
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <label className="task-dimension-filter task-sort-filter">
                  <span>Sort</span>
                  <div className="sort-control">
                    <select
                      value={taskSort}
                      onChange={(event) => {
                        const nextSort = event.target.value as TaskSort;
                        setTaskSort(nextSort);
                        setTaskSortDirection(sortDefaultDirection[nextSort]);
                        setTasksPageNum(1);
                      }}
                    >
                      <option value="priority">Priority</option>
                      <option value="date">Due date</option>
                      <option value="name">Name</option>
                      <option value="duration">Duration</option>
                    </select>
                    <button
                      type="button"
                      className="secondary sort-direction-btn"
                      aria-label={taskSortDirection === 'asc' ? 'Sorting ascending, click for descending' : 'Sorting descending, click for ascending'}
                      title={taskSortDirection === 'asc' ? 'Ascending' : 'Descending'}
                      onClick={() => {
                        setTaskSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                        setTasksPageNum(1);
                      }}
                    >
                      <span aria-hidden="true">{taskSortDirection === 'asc' ? '↑' : '↓'}</span>
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="task-layout">
              <div className="task-groups task-layout-main">
                <div className="task-list">
                  {tasksPage.items.map((item) => (
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
                  {tasksPage.total === 0 ? (
                    <div className="empty-state empty-state-inline">
                      <strong>No work items match.</strong>
                      <p>Try a different filter.</p>
                    </div>
                  ) : null}
                </div>

                <Pagination
                  page={tasksPage.page}
                  pageSize={tasksPage.pageSize}
                  total={tasksPage.total}
                  itemCount={tasksPage.items.length}
                  noun="work items"
                  onPageChange={setTasksPageNum}
                />
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
                      {editingWorkItemId === selectedWorkItem.id ? (
                        workItemFormCard
                      ) : (
                        <>
                          <div className="team-card-title-row">
                            <strong>{selectedWorkItem.title}</strong>
                            <div className="task-detail-title-actions">
                              {selectedWorkItem.status === 'unscheduled' ? (
                                <button type="button" className="secondary task-detail-action-inline" onClick={() => beginEditWorkItem(selectedWorkItem)}>
                                  Edit work item
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="secondary task-detail-action-inline"
                                  onClick={() => void patchWorkItem(selectedWorkItem.id, { assigneeId: null })}
                                >
                                  Unassign work item
                                </button>
                              )}
                            </div>
                          </div>
                          <DetailTable
                            fields={[
                              { label: 'Description', value: selectedWorkItem.description },
                              { label: 'Priority', value: selectedWorkItem.priority },
                              { label: 'Duration', value: `${selectedWorkItem.durationMinutes}m` },
                              { label: 'Due date', value: formatTaskDate(selectedWorkItem.targetDate) },
                              {
                                label: 'Booked',
                                value: selectedItemBooking
                                  ? `${resourceLookup.get(selectedItemBooking.resourceId)?.name ?? 'Unknown'} - ${formatClock(selectedItemBooking.startTime)} to ${formatClock(selectedItemBooking.endTime)}`
                                  : 'Not yet scheduled',
                              },
                            ]}
                          />

                        </>
                      )}
                    </div>
                  </section>
                </aside>
              ) : null}
            </div>
          </section>
          {composerRail}
        </main>
      );
    }

    return (
      <main className="shell shell-home">
        <section className="hero card hero-home">
          {homeIconButton}
          <div className="hero-copy">
            <h1>{greeting}</h1>
            <p className="home-welcome-text">Pick up where you left off</p>

            <div className="home-action-buttons">
              <button type="button" className="secondary" onClick={() => navigate('/schedule')}>
                Schedule work
              </button>
              <button type="button" className="secondary" onClick={() => navigate('/tasks')}>
                Handle backlog
              </button>
              <button type="button" className="secondary" onClick={() => navigate('/team')}>
                Manage team
              </button>
            </div>

            <div className="home-stats">
              {homeStats.map((stat) => (
                <button key={stat.label} type="button" className="home-stat" onClick={stat.onSelect}>
                  <span className="home-stat-icon" aria-hidden="true">
                    <stat.icon size={32} />
                  </span>
                  <span className="home-stat-value">{stat.value}</span>
                  <span className="home-stat-label">{stat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary theme-toggle"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            </button>
          </div>
        </section>
        {composerRail}
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero card">
        {homeIconButton}
        <div className="hero-copy">
          <h1>Assign work fast</h1>
        </div>

        <div className="hero-actions">

          <button
            type="button"
            className="secondary theme-toggle"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div className="task-filters" aria-label="Page filters">
        <label className="task-dimension-filter">
          <span>Dimension</span>
          <select
            value={backlogDimension}
            onChange={(event) => {
              setBacklogDimension(event.target.value as 'priority' | 'skills');
              setBacklogFilterValues([]);
            }}
          >
            {backlogDimensionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="task-value-group" aria-label="Filter values">
          {backlogValueOptions.map((option) => {
            const isActive =
              option.value === 'all' ? backlogFilterValues.length === 0 : backlogFilterValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={isActive ? 'task-filter-chip active' : 'task-filter-chip'}
                onClick={() => {
                  if (option.value === 'all') {
                    setBacklogFilterValues([]);
                  } else {
                    setBacklogFilterValues((current) =>
                      current.includes(option.value)
                        ? current.filter((value) => value !== option.value)
                        : [...current, option.value],
                    );
                  }
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <label className="task-dimension-filter task-sort-filter">
          <span>Sort</span>
          <div className="sort-control">
            <select
              value={taskSort}
              onChange={(event) => {
                const nextSort = event.target.value as TaskSort;
                setTaskSort(nextSort);
                setTaskSortDirection(sortDefaultDirection[nextSort]);
              }}
            >
              <option value="priority">Priority</option>
              <option value="date">Due date</option>
              <option value="name">Name</option>
              <option value="duration">Duration</option>
            </select>
            <button
              type="button"
              className="secondary sort-direction-btn"
              aria-label={taskSortDirection === 'asc' ? 'Sorting ascending, click for descending' : 'Sorting descending, click for ascending'}
              title={taskSortDirection === 'asc' ? 'Ascending' : 'Descending'}
              onClick={() => setTaskSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
            >
              <span aria-hidden="true">{taskSortDirection === 'asc' ? '↑' : '↓'}</span>
            </button>
          </div>
        </label>
      </div>

      <section className="workspace schedule-workspace">
        <aside className="card backlog-panel" aria-label="Work item backlog">
          <div className="section-heading backlog-heading">
            <h2>Work items</h2>
            <button type="button" className="primary backlog-new-btn" onClick={openCreateWorkItem}>
              New work item
            </button>
          </div>

          <label className="backlog-search">
            <div className="search-shell">
              <span aria-hidden="true" className="search-icon">
                Search
              </span>
              <input
                type="search"
                value={workItemQuery}
                onChange={(event) => setWorkItemQuery(event.target.value)}
                placeholder="title, skill, or date"
                aria-label="Search work items"
              />
            </div>
          </label>
          <div
            className={dropTarget?.kind === 'queue' ? 'backlog-list drop-target' : 'backlog-list'}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => {
              if (draggingBookingId) {
                setDropTarget({ kind: 'queue' });
              }
            }}
            onDragLeave={() => {
              if (dropTarget?.kind === 'queue') {
                setDropTarget(null);
              }
            }}
            onDrop={() => void handleQueueDrop()}
          >
            {visibleBacklogItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selectedWorkItemId === item.id ? 'work-item backlog-item selected' : 'work-item backlog-item'}
                draggable
                onDragStart={() => {
                  setDraggingWorkItemId(item.id);
                }}
                onDragEnd={() => {
                  setDraggingWorkItemId(null);
                  setDropTarget(null);
                }}
                onClick={() => toggleWorkItemSelection(item.id)}
              >
                <div className="task-item-copy">
                  <strong>{item.title}</strong>
                </div>

                <div className="task-item-chips">
                  <span className="task-chip task-chip-priority" data-priority={item.priority}>
                    {item.priority}
                  </span>
                  <span className="task-chip task-chip-neutral">{item.durationMinutes}m</span>
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
          <span className="pagination-count backlog-count">
            Showing {visibleBacklogItems.length} out of {backlogItems.length} work items
          </span>
        </aside>

        <section className="board schedule-board" id="board">
          <div className="board-header">
            <h2>Schedule</h2>
          </div>
          <p className="help-text schedule-hint">
            Drag a work item onto a teammate to assign it, or drag a booking back up to Work items to unassign it.
          </p>

          <div className="schedule-grid">
            {visibleResources.map((resource) => {
              const bookings = bookingsByResourceId.get(resource.id) ?? [];
              const bookingGroups = groupBookingsByStart(bookings);

              return (
                <div key={resource.id} className="schedule-row">
                  <button
                    type="button"
                    className={selectedResourceId === resource.id ? 'resource-card selected' : 'resource-card'}
                    style={{ '--card-accent': resource.color } as CSSProperties}
                    onClick={() => {
                      toggleResourceSelection(resource.id);
                    }}
                  >
                    <div className="resource-card-top">
                      <strong>{resource.name}</strong>
                    </div>
                  </button>

                  <div
                    className={dropTarget?.kind === 'resource' && dropTarget.id === resource.id ? 'schedule-lane drop-target' : 'schedule-lane'}
                    style={{ '--card-accent': resource.color } as CSSProperties}
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
                    {!bookings.length ? (
                      <div className="empty-state empty-state-inline schedule-empty">
                        <strong>Open slot</strong>
                        <p>Drop work here to book {resource.name}.</p>
                      </div>
                    ) : null}

                    {bookingGroups.map((group) => (
                      <div key={`${resource.id}-${group.startTime}`} className="booking-group">
                        <span className="booking-group-time">{formatClock(group.startTime)}</span>
                        <div className="booking-stack">
                          {group.bookings.map((booking) => {
                            const workItem = workItemLookup.get(booking.workItemId);
                            const cardAccent = scheduleAccent(workItem?.targetDate ?? booking.startTime);
                            return (
                              <button
                                key={booking.id}
                                type="button"
                                className={['booking-card', 'schedule-booking', draggingBookingId === booking.id ? 'dragging' : '']
                                  .filter(Boolean)
                                  .join(' ')}
                                style={{ '--card-accent': cardAccent } as CSSProperties}
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
                                <span className="booking-time">
                                  {formatClock(booking.startTime)} - {formatClock(booking.endTime)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {hasScheduleDetails ? (
          selectedResource ? (
            <aside
              className="team-detail-rail"
              onClick={() => {
                cancelResourceEdit();
                setSelectedResourceId(null);
              }}
            >
              <section className="task-detail card team-detail" aria-label="Selected teammate" onClick={(event) => event.stopPropagation()}>
                {editingResourceId === selectedResource.id ? (
                  resourceFormCard
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
                      value: selectedResource.skills.length ? (
                        <div className="detail-skill-chips">
                          {selectedResource.skills.map((skill) => (
                            <span key={skill} className="task-chip task-chip-skill">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        'No skills listed'
                      ),
                    },
                  ]}
                />
                <div className="team-bookings">
                  <div className="team-bookings-header">
                    <strong>Booked tasks</strong>
                    <span>{selectedResourceWorkload?.bookings.length ?? 0}</span>
                  </div>
                  {selectedResourceWorkload?.bookings.length ? (
                    selectedResourceWorkload.bookings.map((booking) => {
                      const workItem = workItemLookup.get(booking.workItemId);
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          className="booking-summary"
                          onClick={() => {
                            if (workItem) {
                              toggleWorkItemSelection(workItem.id);
                            }
                          }}
                        >
                          <strong>{workItem?.title ?? 'Booking'}</strong>
                          <p>{workItem?.description ?? 'No description available.'}</p>
                        </button>
                      );
                    })
                  ) : (
                    <p className="help-text">No work assigned yet.</p>
                  )}
                </div>
                </>
                )}
              </section>
            </aside>
          ) : selectedWorkItem ? (
            <aside
              className="task-detail-rail"
              onClick={() => {
                cancelEdit();
                setSelectedWorkItemId(null);
              }}
            >
              <section className="task-detail" aria-label="Selected task" onClick={(event) => event.stopPropagation()}>
                <div className="task-detail-card card">
                {editingWorkItemId === selectedWorkItem.id ? (
                  workItemFormCard
                ) : (
                <>
                <div className="team-card-title-row">
                  <strong>{selectedWorkItem.title}</strong>
                  <div className="task-detail-title-actions">
                    <button type="button" className="secondary task-detail-action-inline" onClick={() => beginEditWorkItem(selectedWorkItem)}>
                      Edit work item
                    </button>
                  </div>
                </div>
                <DetailTable
                  fields={[
                    { label: 'Description', value: selectedWorkItem.description },
                    { label: 'Priority', value: selectedWorkItem.priority },
                    { label: 'Duration', value: `${selectedWorkItem.durationMinutes}m` },
                    { label: 'Due date', value: formatTaskDate(selectedWorkItem.targetDate) },
                    {
                      label: 'Booked',
                      value: selectedItemBooking
                        ? `${resourceLookup.get(selectedItemBooking.resourceId)?.name ?? 'Unknown'} - ${formatClock(selectedItemBooking.startTime)} to ${formatClock(selectedItemBooking.endTime)}`
                        : 'Not yet scheduled',
                    },
                  ]}
                />

                </>
                )}
                </div>
              </section>
            </aside>
          ) : null
        ) : null}
      </section>
      {composerRail}
    </main>
  );
}
