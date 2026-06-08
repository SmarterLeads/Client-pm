type InternalTaskDrawerState = {
  taskId: string | null;
  isOpen: boolean;
};

let state: InternalTaskDrawerState = { taskId: null, isOpen: false };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getInternalTaskDrawerState(): InternalTaskDrawerState {
  return state;
}

export function subscribeInternalTaskDrawer(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openInternalTaskDrawer(taskId: string) {
  state = { taskId, isOpen: true };
  emit();
}

export function closeInternalTaskDrawer() {
  state = { taskId: null, isOpen: false };
  emit();
}
