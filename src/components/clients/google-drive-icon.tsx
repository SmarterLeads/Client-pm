import { cn } from "@/lib/utils";

type GoogleDriveIconProps = {
  className?: string;
};

export function GoogleDriveIcon({ className }: GoogleDriveIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0", className)}
      aria-hidden
    >
      <path
        d="M7.71 3.5 1.15 15l3.42 5.5L12 12 7.71 3.5z"
        fill="#0066DA"
      />
      <path
        d="M16.29 3.5H7.71L12 12l8.85-3.5L16.29 3.5z"
        fill="#00AC47"
      />
      <path
        d="M1.15 15 4.57 20.5h14.86L22.85 15 12 12 1.15 15z"
        fill="#EA4335"
      />
      <path
        d="M12 12 16.29 20.5h8.56L22.85 15 12 12z"
        fill="#FFBA00"
      />
    </svg>
  );
}
