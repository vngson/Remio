"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
  { value: "system", label: "Tự động" },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // next-themes chỉ đọc được localStorage sau khi hydrate; nếu không đợi sẽ
    // lệch hydration. Đây là pattern chính thức của next-themes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="group"
      aria-label="Chế độ hiển thị"
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            className={cn(
              "border-b pb-0.5 text-[0.8125rem] transition-colors",
              active
                ? "border-ink text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
