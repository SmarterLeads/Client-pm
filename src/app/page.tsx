import { redirect } from "next/navigation";
import { getClientUser, getTeamMember } from "@/lib/auth/session";

export default async function HomePage() {
  const [teamMember, clientUser] = await Promise.all([
    getTeamMember(),
    getClientUser(),
  ]);

  if (teamMember) {
    redirect("/dashboard");
  }

  if (clientUser) {
    redirect("/portal/dashboard");
  }

  redirect("/login");
}
