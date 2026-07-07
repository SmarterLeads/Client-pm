import { redirect } from "next/navigation";
import { isBlockedPmEmail } from "@/lib/auth/blocked-emails";
import { getClientUser, getTeamMember } from "@/lib/auth/session";

export default async function HomePage() {
  const [teamMember, clientUser] = await Promise.all([
    getTeamMember(),
    getClientUser(),
  ]);

  const user = teamMember ?? clientUser;
  if (user && "email" in user && isBlockedPmEmail(user.email)) {
    redirect("/auth/access-denied");
  }

  if (teamMember) {
    redirect("/dashboard");
  }

  if (clientUser) {
    redirect("/portal/dashboard");
  }

  redirect("/login");
}
