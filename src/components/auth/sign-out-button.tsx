"use client";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import type { UserPersona } from "@/lib/auth/types";

export function SignOutButton({ persona }: { persona: UserPersona }) {
  return (
    <form action={signOut}>
      <input type="hidden" name="persona" value={persona} />
      <Button type="submit" variant="outline" size="sm">
        Logout
      </Button>
    </form>
  );
}

