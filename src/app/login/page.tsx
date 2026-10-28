import { Suspense } from "react";
import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

const FACTS = [
  "Âm lịch tự tính lại cho từng năm",
  "Nhắc qua email đúng giờ bạn chọn",
  "Không cần mật khẩu",
];

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 justify-center px-5 py-12 sm:py-16">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="border-b-2 border-rule-strong pb-5">
          <Brand showTagline />
        </div>

        {children}

        <ul className="flex flex-col gap-2 border-t border-rule pt-5">
          {FACTS.map((fact) => (
            <li
              key={fact}
              className="flex items-baseline gap-3 text-[0.8125rem] text-ink-faint"
            >
              <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] bg-rule" />
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

async function LoginContent({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : "/dashboard";
  const next = rawNext.startsWith("/") ? rawNext : "/dashboard";
  const linkFailed = params.error === "link";

  return (
    <LoginShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="label-print text-ink-faint">Đăng nhập</span>
          <h1 className="text-2xl">Đăng nhập hoặc tạo tài khoản</h1>
          <p className="text-ink-soft">
            Nhập email để nhận liên kết đăng nhập. Không cần mật khẩu.
          </p>
        </div>

        {linkFailed ? (
          <p className="rounded-slip border border-son/45 px-4 py-3 text-[0.8125rem] text-son">
            Liên kết trong email đã hết hạn hoặc không dùng được. Nhập email bên
            dưới để nhận liên kết mới.
          </p>
        ) : null}

        <LoginForm next={next} />

        <p className="text-[0.8125rem] text-ink-faint">
          Bằng việc đăng nhập, bạn đồng ý nhận email nhắc nhở từ Remio. Bạn có
          thể tạm dừng từng lời nhắc bất cứ lúc nào.
        </p>
      </div>
    </LoginShell>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginShell>{null}</LoginShell>}>
      <LoginContent searchParams={props.searchParams} />
    </Suspense>
  );
}
