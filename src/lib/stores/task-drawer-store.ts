export type TaskCreateDraft = {
  projectId: string;
  sectionId: string;
  assigneeId: string;
  sections: Array<{ id: string; name: string; display_order: number; project_id: string; created_at: string }>;
};

export type TaskDrawerStoreState = {
  taskId: string | null;
  isOpen: boolean;
  createDraft: TaskCreateDraft | null;
};

const CLOSE_ANIMATION_MS = 300;

let state: TaskDrawerStoreState = {
  taskId: null,
  isOpen: false,
  createDraft: null,
};
let clearTaskIdTimeoutId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeTaskDrawer(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTaskDrawerState(): TaskDrawerStoreState {
  return state;
}

export function openTaskDrawer(taskId: string) {
  if (clearTaskIdTimeoutId) {
    clearTimeout(clearTaskIdTimeoutId);
    clearTaskIdTimeoutId = null;
  }
  if (state.taskId === taskId && state.isOpen && !state.createDraft) {
    return;
  }
  state = { taskId, isOpen: true, createDraft: null };
  notify();
}

export function openTaskCreateDrawer(draft: TaskCreateDraft) {
  if (clearTaskIdTimeoutId) {
    clearTimeout(clearTaskIdTimeoutId);
    clearTaskIdTimeoutId = null;
  }
  state = { taskId: null, isOpen: true, createDraft: draft };
  notify();
}

export function closeTaskDrawer() {
  state = { ...state, isOpen: false };
  notify();

  if (clearTaskIdTimeoutId) {
    clearTimeout(clearTaskIdTimeoutId);
  }

  clearTaskIdTimeoutId = setTimeout(() => {
    state = { taskId: null, isOpen: false, createDraft: null };
    clearTaskIdTimeoutId = null;
    notify();
  }, CLOSE_ANIMATION_MS);
}

export function closeTaskCreateDrawer() {
  closeTaskDrawer();
}
