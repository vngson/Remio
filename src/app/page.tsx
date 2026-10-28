import Link from "next/link";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ENTRIES = [
  {
    n: "01",
    title: "Âm lịch tự tính lại mỗi năm",
    body: "Nhập ngày giỗ hay lễ Tết theo âm lịch. Remio quy đổi sang dương lịch cho từng năm, kể cả tháng nhuận.",
  },
  {
    n: "02",
    title: "Nhắc qua email, đúng giờ bạn chọn",
    body: "Mỗi sự kiện có giờ gửi riêng. Chọn nhắc trước 7, 3, 1 ngày hoặc đúng ngày.",
  },
  {
    n: "03",
    title: "Ngày đặc biệt được đánh dấu",
    body: "Ngày giỗ, sinh nhật, kỷ niệm nằm chung một danh sách, có màu riêng để nhìn là thấy.",
  },
  {
    n: "04",
    title: "Tờ lịch tháng nhìn được cả hai lịch",
    body: "Mỗi ô hiện ngày dương cỡ lớn và ngày âm cỡ nhỏ, đúng kiểu lịch bloc.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Nhập email",
    body: "Remio gửi một mã xác nhận. Không cần đặt mật khẩu.",
  },
  {
    n: "2",
    title: "Ghi ngày bạn muốn nhớ",
    body: "Chọn dương lịch hoặc âm lịch, đặt giờ gửi và số ngày nhắc trước.",
  },
  {
    n: "3",
    title: "Nhận email trước ngày đó",
    body: "Remio tự tính lại ngày cho từng năm và nhắc bạn đúng lúc.",
  },
];

function RedMark() {
  return (
    <span className="mr-2 inline-block h-2 w-2 bg-son" aria-hidden="true" />
  );
}

function CalendarLeaf() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-slip border border-rule bg-raised">
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3">
          <span className="label-print text-ink-soft">Ngày giỗ ông nội</span>
          <Badge variant="son">Âm lịch</Badge>
        </div>

        <div className="flex items-end gap-5 px-5 py-6">
          <span className="numeral font-display text-[4.25rem] font-medium leading-[0.8] text-ink">
            17
          </span>
          <span className="flex flex-col gap-1.5 pb-1">
            <span className="font-display text-xl leading-none text-ink">
              Tháng 9
            </span>
            <span className="label-print text-ink-faint">2026 · Thứ Năm</span>
          </span>
        </div>

        <div className="flex items-baseline gap-3 border-t border-rule px-5 py-4">
          <span className="label-print text-ink-faint">Âm lịch</span>
          <span className="text-ink-soft">15 tháng Tám</span>
        </div>
      </div>

      <div className="rounded-slip border border-rule bg-raised px-5 py-4">
        <p className="label-print text-ink">
          <RedMark />
          Nhắc trước 3 ngày · 08:00
        </p>
        <p className="mt-2 text-ink-soft">
          Còn 3 ngày: Ngày giỗ ông nội
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b-2 border-rule-strong">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Brand />
            <span className="label-print hidden text-ink-faint sm:inline">
              Sổ ngày kỷ niệm
            </span>
          </div>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Đăng nhập
          </Link>
        </div>
      </div>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-7">
            <span className="label-print text-ink-faint">
              Âm lịch và dương lịch, một chỗ
            </span>

            <h1 className="max-w-2xl text-[2.5rem] leading-[1.04] sm:text-[3.25rem] lg:text-[3.75rem]">
              Đừng để quên
              <br />
              ngày quan trọng
            </h1>

            <p className="max-w-xl text-lg text-ink-soft">
              Ghi lại ngày giỗ, sinh nhật, kỷ niệm hay lễ Tết. Remio tính lại
              ngày theo âm lịch cho từng năm và gửi email nhắc bạn trước ngày
              đó.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
              >
                Bắt đầu ghi ngày
              </Link>
              <a
                href="#cach-hoat-dong"
                className={cn(buttonVariants({ variant: "quiet", size: "lg" }))}
              >
                Xem cách hoạt động
              </a>
            </div>

            <p className="label-print text-ink-faint">
              Miễn phí · Không cần thẻ · Tắt nhắc bất cứ lúc nào
            </p>
          </div>

          <CalendarLeaf />
        </section>

        <section className="border-t border-rule">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="text-[1.75rem] sm:text-[2rem]">
              Remio giữ những gì cho bạn
            </h2>

            <ol className="mt-10">
              {ENTRIES.map((entry) => (
                <li
                  key={entry.n}
                  className="grid gap-3 border-t border-rule py-6 sm:grid-cols-[3rem_14rem_1fr] sm:gap-6"
                >
                  <span className="numeral font-display text-lg text-ink-faint">
                    {entry.n}
                  </span>
                  <h3 className="text-base font-medium">{entry.title}</h3>
                  <p className="text-ink-soft">{entry.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="cach-hoat-dong"
          className="border-t border-rule border-t-2 border-t-rule-strong"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="text-[1.75rem] sm:text-[2rem]">Ba bước để bắt đầu</h2>

            <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-0">
              {STEPS.map((step, index) => (
                <li
                  key={step.n}
                  className={cn(
                    "flex flex-col gap-3",
                    index > 0 && "sm:border-l sm:border-rule sm:pl-8",
                    index < STEPS.length - 1 && "sm:pr-8",
                  )}
                >
                  <span className="numeral font-display text-4xl text-son">
                    {step.n}
                  </span>
                  <span className="text-base font-medium">{step.title}</span>
                  <span className="text-ink-soft">{step.body}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t-2 border-rule-strong">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8">
            <h2 className="max-w-2xl text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">
              Ngày quan trọng của bạn xứng đáng được nhớ đúng cách
            </h2>
            <p className="max-w-xl text-ink-soft">
              Thêm sự kiện đầu tiên mất chưa tới một phút. Phần tính toán và
              nhắc nhở để Remio lo.
            </p>
            <div>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
              >
                Bắt đầu ghi ngày
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-3 px-5 py-6 sm:flex-row sm:items-center sm:px-8">
          <Brand />
          <span className="label-print text-ink-faint">
            Ngày kỷ niệm · âm lịch và dương lịch · nhắc qua email
          </span>
        </div>
      </footer>
    </div>
  );
}
