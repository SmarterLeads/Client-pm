import { MyTasksList } from "@/components/tasks/my-tasks-list";
import { getTeamMember } from "@/lib/auth/session";
import { groupMyTasks, getMyTasks } from "@/lib/queries/tasks";
import { redirect } from "next/navigation";

export default async function TasksPage() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  const tasks = await getMyTasks(teamMember.id);

  const groups = groupMyTasks(tasks);
  const total = tasks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {total} open task{total === 1 ? "" : "s"} assigned to you
        </p>
      </div>
      <MyTasksList groups={groups} />
    </div>
  );
}
