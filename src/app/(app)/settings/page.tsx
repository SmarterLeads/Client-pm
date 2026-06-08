import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin } from "@/lib/auth/roles";
import { getTeamMember } from "@/lib/auth/session";

const settingsLinks = [
  {
    href: "/settings/team",
    title: "Team",
    description: "Invite members, manage roles, and deactivate accounts.",
  },
  {
    href: "/settings/templates",
    title: "Templates",
    description: "Create and manage reusable project templates.",
    icon: LayoutTemplate,
  },
  {
    href: "/settings/account",
    title: "Account",
    description: "Update your profile and change your password.",
  },
] as const;

export default async function SettingsPage() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Team administration and your account preferences.
        </p>
        {!isAdmin(teamMember.role) ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Signed in as {teamMember.role} — team management requires admin
            access.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {"icon" in link && link.icon ? (
                    <link.icon className="size-4 text-muted-foreground" />
                  ) : null}
                  {link.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {link.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
