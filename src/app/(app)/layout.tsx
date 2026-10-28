import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { BottomNav, SidebarNav } from "@/components/app/nav";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UserPanel, UserPanelSkeleton } from "@/components/app/user-panel";

function SidebarNavSkeleton() {
  return (
    <div className="flex flex-col gap-3 pl-6">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-4 w-28 animate-pulse rounded-slip bg-ink/8"
        />
      ))}
    </div>
  );
}

function BottomNavSkeleton() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 h-16 border-t border-rule bg-paper lg:hidden" />
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="hidden shrink-0 flex-col border-r border-rule lg:flex lg:w-60">
        <div className="px-6 py-6">
          <Brand showTagline />
        </div>
        <Suspense fallback={<SidebarNavSkeleton />}>
          <SidebarNav />
        </Suspense>
        <div className="mt-auto flex flex-col gap-5 border-t border-rule px-6 py-5">
          <Suspense fallback={<UserPanelSkeleton />}>
            <UserPanel />
          </Suspense>
          <ThemeToggle />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-rule bg-paper px-5 py-3 lg:hidden">
        <Brand />
        <div className="flex items-center gap-4">
          <ThemeToggle className="hidden sm:flex" />
          <Suspense fallback={null}>
            <UserPanel compact />
          </Suspense>
        </div>
      </header>

      <main className="flex-1 pb-24 lg:pb-0">{children}</main>

      <Suspense fallback={<BottomNavSkeleton />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
