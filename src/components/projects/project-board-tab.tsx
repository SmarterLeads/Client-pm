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
import { TaskCard } from "@/components/projects/task-card";
import { QuickAddTaskForm } from "@/components/tasks/quick-add-task-form";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { moveTaskSection } from "@/lib/actions/projects";
import type { ProjectTaskRow } from "@/lib/queries/projects";
import { toastError } from "@/lib/toast";
import type { ProjectSection, TeamMember } from "@/lib/types";

type ProjectBoardTabProps = {
  projectId: string;
  sections: ProjectSection[];
  tasks: ProjectTaskRow[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
};

const COLUMN_TYPE = "column";
const TASK_TYPE = "task";

function resolveDropSectionId(
  overId: UniqueIdentifier,
  overData: { type?: string; sectionId?: string } | undefined,
  sections: ProjectSection[],
  tasks: ProjectTaskRow[],
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
  section: ProjectSection;
  tasks: ProjectTaskRow[];
  projectId: string;
  teamMembers: Pick<TeamMember, "id" | "name">[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: { type: COLUMN_TYPE, sectionId: section.id },
  });
  const { openTask } = useTaskDrawer();

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
          <TaskCard key={task.id} task={task} projectId={projectId} />
        ))}
        <QuickAddTaskForm
          projectId={projectId}
          sectionId={section.id}
          teamMembers={teamMembers}
          onCreated={openTask}
        />
      </div>
    </div>
  );
}

export function ProjectBoardTab({
  projectId,
  sections,
  tasks: initialTasks,
  teamMembers,
}: ProjectBoardTabProps) {
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
    const map = new Map<string, ProjectTaskRow[]>();
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
      void moveTaskSection(projectId, taskId, sectionId).then((result) => {
        if (result.error) {
          toastError(result.error);
        }
      });
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
            <TaskCard task={activeTask} projectId={projectId} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
