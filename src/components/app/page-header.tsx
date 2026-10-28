import { MetaLabel } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Đầu trang kiểu tít báo: nhãn nhỏ, tiêu đề, rồi một đường kẻ đậm. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b-2 border-rule-strong pb-5">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? <MetaLabel>{eyebrow}</MetaLabel> : null}
          <h1 className="text-[1.625rem] leading-[1.1] sm:text-[1.875rem]">
            {title}
          </h1>
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-ink-soft">{description}</p>
      ) : null}
    </header>
  );
}
