import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("flex flex-col gap-1", className)}>
      <Image
        src="/branding/remio-logo-v1.png"
        alt="Remio"
        width={144}
        height={48}
        className="h-12 w-36 object-contain dark:invert dark:hue-rotate-180"
      />
      {showTagline ? (
        <span className="label-print text-ink-faint">Sổ ngày kỷ niệm</span>
      ) : null}
    </span>
  );
}
