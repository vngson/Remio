import { cn } from "@/lib/utils";

/** Nhãn nhỏ in hoa, dùng cho metadata. */
export function MetaLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("label-print text-ink-faint", className)}>
      {children}
    </span>
  );
}

/** Một mục có đường kẻ phía trên và tiêu đề, thay cho các khối card. */
export function Section({
  title,
  meta,
  action,
  children,
  className,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-rule pt-5", className)}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl">{title}</h2>
          {meta ? <MetaLabel>{meta}</MetaLabel> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
