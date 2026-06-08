export function UnconfiguredConversionsBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
      role="status"
    >
      <span
        className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500"
        aria-hidden
      />
      <div>
        <p className="font-semibold">Unconfigured conversions</p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          Some conversion actions are marked <strong>new</strong> and inactive.
          Map or activate them in your conversion config to include them in
          reporting.
        </p>
      </div>
    </div>
  );
}
