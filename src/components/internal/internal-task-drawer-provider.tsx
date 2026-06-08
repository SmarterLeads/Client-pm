"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { InternalTaskDrawer } from "@/components/internal/internal-task-drawer";
import {
  closeInternalTaskDrawer,
  getInternalTaskDrawerState,
  openInternalTaskDrawer,
  subscribeInternalTaskDrawer,
} from "@/lib/stores/internal-task-drawer-store";

import type { TeamMember } from "@/lib/types";

type InternalTaskDrawerContextValue = {
  openTask: (taskId: string) => void;
  closeTask: () => void;
  taskId: string | null;
};

const InternalTaskDrawerContext =
  createContext<InternalTaskDrawerContextValue | null>(null);

export function useInternalTaskDrawer() {
  const ctx = useContext(InternalTaskDrawerContext);
  if (!ctx) {
    throw new Error(
      "useInternalTaskDrawer must be used within InternalTaskDrawerProvider",
    );
  }
  return ctx;
}

export function InternalTaskDrawerProvider({
  children,
  teamMembers,
}: {
  children: React.ReactNode;
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
}) {
  const router = useRouter();
  const { taskId, isOpen } = useSyncExternalStore(
    subscribeInternalTaskDrawer,
    getInternalTaskDrawerState,
    getInternalTaskDrawerState,
  );

  const openTask = useCallback((id: string) => {
    openInternalTaskDrawer(id);
  }, []);

  const closeTask = useCallback(() => {
    closeInternalTaskDrawer();
    window.setTimeout(() => router.refresh(), 350);
  }, [router]);

  const contextValue = useMemo(
    () => ({
      taskId,
      openTask,
      closeTask,
    }),
    [taskId, openTask, closeTask],
  );

  return (
    <InternalTaskDrawerContext.Provider value={contextValue}>
      {children}
      <InternalTaskDrawer
        taskId={taskId}
        teamMembers={teamMembers}
        isOpen={isOpen}
        onClose={closeTask}
      />
    </InternalTaskDrawerContext.Provider>
  );
}
