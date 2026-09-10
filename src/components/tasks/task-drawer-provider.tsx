"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { TaskDrawer } from "@/components/tasks/task-drawer";
import {
  closeTaskDrawer,
  getTaskDrawerState,
  openTaskCreateDrawer,
  openTaskDrawer,
  subscribeTaskDrawer,
  type TaskCreateDraft,
} from "@/lib/stores/task-drawer-store";
import type { TeamMember } from "@/lib/types";

type TaskDrawerContextValue = {
  openTask: (taskId: string) => void;
  openCreateTask: (draft: TaskCreateDraft) => void;
  closeTask: () => void;
  taskId: string | null;
};

const TaskDrawerContext = createContext<TaskDrawerContextValue | null>(null);

export function useTaskDrawer() {
  const ctx = useContext(TaskDrawerContext);
  if (!ctx) {
    throw new Error("useTaskDrawer must be used within TaskDrawerProvider");
  }
  return ctx;
}

export function TaskDrawerProvider({
  children,
  teamMembers,
}: {
  children: React.ReactNode;
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
}) {
  const router = useRouter();
  const { taskId, isOpen, createDraft } = useSyncExternalStore(
    subscribeTaskDrawer,
    getTaskDrawerState,
    getTaskDrawerState,
  );

  const openTask = useCallback((id: string) => {
    openTaskDrawer(id);
  }, []);

  const openCreateTask = useCallback((draft: TaskCreateDraft) => {
    openTaskCreateDrawer(draft);
  }, []);

  const closeTask = useCallback(() => {
    closeTaskDrawer();
    window.setTimeout(() => router.refresh(), 350);
  }, [router]);

  const contextValue = useMemo(
    () => ({
      taskId,
      openTask,
      openCreateTask,
      closeTask,
    }),
    [taskId, openTask, openCreateTask, closeTask],
  );

  return (
    <TaskDrawerContext.Provider value={contextValue}>
      {children}
      <TaskDrawer
        taskId={taskId}
        createDraft={createDraft}
        teamMembers={teamMembers}
        isOpen={isOpen}
        onClose={closeTask}
      />
    </TaskDrawerContext.Provider>
  );
}
