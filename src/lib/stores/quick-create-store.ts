export type QuickCreateType =
  | "client"
  | "contact"
  | "project"
  | "task"
  | "interaction";

type QuickCreateState = {
  active: QuickCreateType | null;
};

let state: QuickCreateState = { active: null };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getQuickCreateState(): QuickCreateState {
  return state;
}

export function subscribeQuickCreate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openQuickCreate(type: QuickCreateType) {
  state = { active: type };
  emit();
}

export function closeQuickCreate() {
  state = { active: null };
  emit();
}
