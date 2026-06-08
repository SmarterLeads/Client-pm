export type TaskDrawerStoreState = {
  taskId: string | null;
  isOpen: boolean;
};

const CLOSE_ANIMATION_MS = 300;

let state: TaskDrawerStoreState = { taskId: null, isOpen: false };
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
  if (state.taskId === taskId && state.isOpen) {
    return;
  }
  state = { taskId, isOpen: true };
  notify();
}

export function closeTaskDrawer() {
  state = { ...state, isOpen: false };
  notify();

  if (clearTaskIdTimeoutId) {
    clearTimeout(clearTaskIdTimeoutId);
  }

  clearTaskIdTimeoutId = setTimeout(() => {
    state = { taskId: null, isOpen: false };
    clearTaskIdTimeoutId = null;
    notify();
  }, CLOSE_ANIMATION_MS);
}
