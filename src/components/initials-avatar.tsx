import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

export function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
