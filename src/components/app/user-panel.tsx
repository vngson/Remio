import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";

function initialsOf(name: string | null, email: string): string {
  const source = (name?.trim() || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserPanelSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 animate-pulse rounded-slip bg-ink/8" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-2.5 w-24 animate-pulse rounded-slip bg-ink/8" />
        <div className="h-2.5 w-32 animate-pulse rounded-slip bg-ink/8" />
      </div>
    </div>
  );
}

export async function UserPanel({ compact = false }: { compact?: boolean }) {
  const user = await requireUser();
  const displayName = user.fullName ?? user.email;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="label-print flex h-9 w-9 items-center justify-center rounded-slip border border-rule text-ink"
        >
          {initialsOf(user.fullName, user.email)}
        </span>
        <form action={signOutAction}>
          <Button type="submit" variant="quiet" size="icon" aria-label="Đăng xuất">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="label-print flex h-9 w-9 shrink-0 items-center justify-center rounded-slip border border-rule text-ink"
        >
          {initialsOf(user.fullName, user.email)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[0.8125rem] font-medium text-ink">
            {displayName}
          </span>
          {user.fullName ? (
            <span className="truncate text-[0.75rem] text-ink-faint">
              {user.email}
            </span>
          ) : null}
        </span>
      </div>

      <form action={signOutAction}>
        <Button type="submit" variant="quiet" size="sm" className="h-auto px-0 py-0">
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}
