import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/components/settings/account-profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeamMember } from "@/lib/auth/session";

export default async function SettingsAccountPage() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Account settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your profile and security preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountProfileForm teamMember={teamMember} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
