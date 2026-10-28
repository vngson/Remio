"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Chọn một trong hai. Kiểu "tab gạch chân" như mục lục bản in, không phải
 * viên thuốc bo tròn.
 */
export function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
  className,
}: {
  name?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-6 border-b border-rule", className)} role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
              active
                ? "border-son text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft",
            )}
          >
            {option.label}
          </button>
        );
      })}
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}
