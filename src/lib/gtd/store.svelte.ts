// store.svelte.ts — GTD data layer com Svelte 5 runes
// Estado reativo global + persistencia localStorage + sync Supabase

export const DEFAULT_CONTEXTS = [
  "@Escritório",
  "@Casa",
  "@Computador",
  "@Telefone",
  "@Online",
  "@Rua",
  "@Qualquer Lugar",
];

export interface InboxItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface Action {
  id: string;
  text: string;
  context: string;
  energy: string;
  time: string;
  projectId: string | null;
  notes: string;
  createdAt: string;
  dueDate: string;
}

export interface Project {
  id: string;
  name: string;
  outcome: string;
  actions: Action[];
  createdAt: string;
}

export interface CalendarItem {
  id: string;
  text: string;
  date: string;
  time: string;
  createdAt: string;
}

export interface WaitingItem {
  id: string;
  text: string;
  person: string;
  delegatedAt: string;
  createdAt: string;
}

export interface SomedayItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface ReferenceItem {
  id: string;
  text: string;
  tags: string;
  createdAt: string;
}

export interface GTDData {
  inbox: InboxItem[];
  actions: Action[];
  projects: Project[];
  calendar: CalendarItem[];
  waiting: WaitingItem[];
  someday: SomedayItem[];
  reference: ReferenceItem[];
  contexts: string[];
  reviewState: Record<string, boolean>;
  completedToday: number;
  lastDate: string;
}

function emptyData(): GTDData {
  return {
    inbox: [],
    actions: [],
    projects: [],
    calendar: [],
    waiting: [],
    someday: [],
    reference: [],
    contexts: [...DEFAULT_CONTEXTS],
    reviewState: {},
    completedToday: 0,
    lastDate: new Date().toDateString(),
  };
}

const STORAGE_KEY = "gtd-data";

function loadFromStorage(): GTDData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return emptyData();
}

function saveToStorage(d: GTDData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // ignore quota errors
  }
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Estado global reativo com Svelte 5 runes
// Usar apenas dentro de componentes Svelte (.svelte) ou arquivos .svelte.ts
export function createGtdStore() {
  let data = $state<GTDData>(emptyData());

  function init() {
    const loaded = loadFromStorage();
    // Reset daily counter
    if (loaded.lastDate !== new Date().toDateString()) {
      loaded.completedToday = 0;
      loaded.lastDate = new Date().toDateString();
    }
    data = loaded;
  }

  function save() {
    saveToStorage(data);
  }

  function addInboxItem(text: string) {
    if (!text.trim()) return;
    data.inbox = [
      { id: genId(), text: text.trim(), createdAt: new Date().toISOString() },
      ...data.inbox,
    ];
    save();
  }

  function removeInboxItem(id: string) {
    data.inbox = data.inbox.filter((i) => i.id !== id);
    save();
  }

  function addAction(action: Omit<Action, "id" | "createdAt">) {
    data.actions = [
      ...data.actions,
      { ...action, id: genId(), createdAt: new Date().toISOString() },
    ];
    save();
  }

  function completeAction(id: string) {
    data.actions = data.actions.filter((a) => a.id !== id);
    data.completedToday = (data.completedToday ?? 0) + 1;
    save();
  }

  function removeAction(id: string) {
    data.actions = data.actions.filter((a) => a.id !== id);
    save();
  }

  function addProject(name: string, outcome = "") {
    data.projects = [
      ...data.projects,
      {
        id: genId(),
        name,
        outcome,
        actions: [],
        createdAt: new Date().toISOString(),
      },
    ];
    save();
  }

  function removeProject(id: string) {
    data.projects = data.projects.filter((p) => p.id !== id);
    data.actions = data.actions.filter((a) => a.projectId !== id);
    save();
  }

  function addCalendarItem(item: Omit<CalendarItem, "id" | "createdAt">) {
    data.calendar = [
      ...data.calendar,
      { ...item, id: genId(), createdAt: new Date().toISOString() },
    ];
    save();
  }

  function removeCalendarItem(id: string) {
    data.calendar = data.calendar.filter((c) => c.id !== id);
    save();
  }

  function addWaitingItem(item: Omit<WaitingItem, "id" | "createdAt">) {
    data.waiting = [
      ...data.waiting,
      { ...item, id: genId(), createdAt: new Date().toISOString() },
    ];
    save();
  }

  function removeWaitingItem(id: string) {
    data.waiting = data.waiting.filter((w) => w.id !== id);
    save();
  }

  function addSomedayItem(text: string) {
    data.someday = [
      ...data.someday,
      { id: genId(), text, createdAt: new Date().toISOString() },
    ];
    save();
  }

  function removeSomedayItem(id: string) {
    data.someday = data.someday.filter((s) => s.id !== id);
    save();
  }

  function addReferenceItem(item: Omit<ReferenceItem, "id" | "createdAt">) {
    data.reference = [
      ...data.reference,
      { ...item, id: genId(), createdAt: new Date().toISOString() },
    ];
    save();
  }

  function removeReferenceItem(id: string) {
    data.reference = data.reference.filter((r) => r.id !== id);
    save();
  }

  function exportData(): string {
    return JSON.stringify(data, null, 2);
  }

  function importData(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      data = { ...emptyData(), ...parsed };
      save();
      return true;
    } catch {
      return false;
    }
  }

  function loadCloudData(cloudData: GTDData) {
    data = { ...emptyData(), ...cloudData };
    save();
  }

  return {
    get data() {
      return data;
    },
    init,
    save,
    addInboxItem,
    removeInboxItem,
    addAction,
    completeAction,
    removeAction,
    addProject,
    removeProject,
    addCalendarItem,
    removeCalendarItem,
    addWaitingItem,
    removeWaitingItem,
    addSomedayItem,
    removeSomedayItem,
    addReferenceItem,
    removeReferenceItem,
    exportData,
    importData,
    loadCloudData,
  };
}
