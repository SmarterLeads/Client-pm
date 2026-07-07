import { redirect } from "next/navigation";
import { isBlockedPmEmail } from "@/lib/auth/blocked-emails";
import { getClientUser, getPublicClientUser, getSessionUser, getTeamMember } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    if (isBlockedPmEmail(user.email) || (await getPublicClientUser(user.id))) {
      redirect("/auth/access-denied");
    }
  }

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
