"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  UniqueIdentifier,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { InternalQuickAddTaskForm } from "@/components/internal/internal-quick-add-task-form";
import { InternalTaskCard } from "@/components/internal/internal-task-card";
import { useInternalTaskDrawer } from "@/components/internal/internal-task-drawer-provider";
import { moveInternalTaskSection } from "@/lib/actions/internal";
import type { InternalProjectTaskRow } from "@/lib/queries/internal";
import { toastError } from "@/lib/toast";
import type { InternalProjectSection } from "@/lib/types/internal";
import type { TeamMember } from "@/lib/types";

type InternalProjectBoardTabProps = {
  projectId: string;
  sections: InternalProjectSection[];
  tasks: InternalProjectTaskRow[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
};

const COLUMN_TYPE = "column";

function resolveDropSectionId(
  overId: UniqueIdentifier,
  overData: { type?: string; sectionId?: string } | undefined,
  sections: InternalProjectSection[],
  tasks: InternalProjectTaskRow[],
): string | null {
  if (overData?.type === COLUMN_TYPE && overData.sectionId) {
    return overData.sectionId;
  }

  if (sections.some((s) => s.id === overId)) {
    return String(overId);
  }

  const overTask = tasks.find((t) => t.id === overId);
  if (overTask?.section_id) {
    return overTask.section_id;
  }

  return null;
}

function BoardColumn({
  section,
  tasks,
  projectId,
  teamMembers,
}: {
  section: InternalProjectSection;
  tasks: InternalProjectTaskRow[];
  projectId: string;
  teamMembers: Pick<TeamMember, "id" | "name">[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: { type: COLUMN_TYPE, sectionId: section.id },
  });
  const { openTask } = useInternalTaskDrawer();

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{section.name}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        }`}
      >
        {tasks.map((task) => (
          <InternalTaskCard key={task.id} task={task} projectId={projectId} />
        ))}
        <InternalQuickAddTaskForm
          projectId={projectId}
          sectionId={section.id}
          teamMembers={teamMembers}
          onCreated={openTask}
        />
      </div>
    </div>
  );
}

export function InternalProjectBoardTab({
  projectId,
  sections,
  tasks: initialTasks,
  teamMembers,
}: InternalProjectBoardTabProps) {
  const [, startTransition] = useTransition();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    initialTasks,
    (current, update: { taskId: string; sectionId: string }) =>
      current.map((t) =>
        t.id === update.taskId ? { ...t, section_id: update.sectionId } : t,
      ),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
  );

  const tasksBySection = useMemo(() => {
    const map = new Map<string, InternalProjectTaskRow[]>();
    for (const section of sections) {
      map.set(section.id, []);
    }
    for (const task of optimisticTasks) {
      const sectionId = task.section_id ?? sections[0]?.id;
      if (sectionId && map.has(sectionId)) {
        map.get(sectionId)!.push(task);
      } else if (sections[0]) {
        map.get(sections[0].id)!.push(task);
      }
    }
    return map;
  }, [optimisticTasks, sections]);

  const activeTask = activeTaskId
    ? optimisticTasks.find((t) => t.id === activeTaskId)
    : null;

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const sectionId = resolveDropSectionId(
      over.id,
      over.data.current as { type?: string; sectionId?: string } | undefined,
      sections,
      optimisticTasks,
    );

    if (!sectionId) return;

    const task = optimisticTasks.find((t) => t.id === taskId);
    if (!task || task.section_id === sectionId) return;

    startTransition(() => {
      setOptimisticTasks({ taskId, sectionId });
      void moveInternalTaskSection(projectId, taskId, sectionId).then(
        (result) => {
          if (result.error) {
            toastError(result.error);
          }
        },
      );
    });
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No board sections configured for this project.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(event) => setActiveTaskId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sections.map((section) => (
          <BoardColumn
            key={section.id}
            section={section}
            tasks={tasksBySection.get(section.id) ?? []}
            projectId={projectId}
            teamMembers={teamMembers}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72 rotate-2 opacity-95">
            <InternalTaskCard
              task={activeTask}
              projectId={projectId}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
