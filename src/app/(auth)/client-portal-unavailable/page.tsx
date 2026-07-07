import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

export default function ClientPortalUnavailablePage() {
  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Client access temporarily unavailable
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Client portal access is paused while we resolve a security issue. Please
        contact your account manager if you need assistance.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <SignOutButton persona="portal" />
        <Button type="button" variant="outline" render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </div>
    </div>
  );
}
