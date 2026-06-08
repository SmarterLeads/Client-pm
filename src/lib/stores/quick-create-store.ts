export type QuickCreateType =
  | "client"
  | "contact"
  | "project"
  | "task"
  | "interaction";

export type QuickCreateOptions = {
  taskDefaults?: {
    assigneeId?: string;
  };
};

type QuickCreateState = {
  active: QuickCreateType | null;
  options: QuickCreateOptions;
};

let state: QuickCreateState = { active: null, options: {} };
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

export function openQuickCreate(
  type: QuickCreateType,
  options?: QuickCreateOptions,
) {
  state = { active: type, options: options ?? {} };
  emit();
}

export function closeQuickCreate() {
  state = { active: null, options: {} };
  emit();
}
