import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-20">
      <div className="flex w-full max-w-md flex-col gap-6 border-t-2 border-rule-strong pt-8">
        <span className="label-print text-ink-faint">Lỗi 404</span>
        <h1 className="text-3xl">Không tìm thấy trang này</h1>
        <p className="text-ink-soft">
          Đường dẫn có thể đã sai, hoặc ngày bạn tìm không còn trong danh sách.
        </p>
        <div>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Về trang tổng quan
          </Link>
        </div>
      </div>
    </main>
  );
}
