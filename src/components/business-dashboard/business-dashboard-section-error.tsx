export function BusinessDashboardSectionError({
  section,
}: {
  section: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-6 text-sm text-muted-foreground">
      Unable to load {section}. Other dashboard sections may still be available.
      Check server logs for{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs">
        [BusinessDashboard]
      </code>{" "}
      errors.
    </div>
  );
}
