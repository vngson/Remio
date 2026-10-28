import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-slip border border-rule bg-raised px-3 text-sm text-ink transition-colors placeholder:text-ink-faint focus-visible:border-son disabled:cursor-not-allowed disabled:opacity-55";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(CONTROL, "min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

const CHEVRON =
  "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Select({
  className,
  style,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        CONTROL,
        "h-10 appearance-none bg-[length:0.95rem] bg-[right_0.65rem_center] bg-no-repeat pr-9",
        className,
      )}
      style={{ backgroundImage: CHEVRON, ...style }}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("label-print text-ink-soft", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-[0.8125rem] text-son">{error}</p>
      ) : hint ? (
        <p className="text-[0.8125rem] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}
