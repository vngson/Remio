import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Nhãn kiểu bản in: chữ nhỏ, in hoa, không bo tròn kiểu viên thuốc. */
export const badgeVariants = cva(
  "label-print inline-flex items-center gap-1.5 rounded-slip border px-1.5 py-1",
  {
    variants: {
      variant: {
        quiet: "border-rule text-ink-faint",
        ink: "border-rule-strong text-ink",
        son: "border-son/45 text-son",
        jade: "border-jade/45 text-jade",
      },
    },
    defaultVariants: {
      variant: "quiet",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
