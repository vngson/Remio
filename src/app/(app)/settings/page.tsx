import { Suspense } from "react";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/ui/surface";
import { requireUser } from "@/lib/auth";
import { RemindTimeForm, TestEmailForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Cài đặt",
};

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-rule py-3 first:border-t-0">
      <span className="label-print text-ink-faint">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

async function SettingsContent() {
  const user = await requireUser();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cài đặt"
        title="Tài khoản và nhắc nhở"
        description="Những gì Remio dùng để gửi email cho bạn."
      />

      <Section title="Tài khoản">
        <div className="flex flex-col">
          <ReadOnlyRow label="Email nhận nhắc" value={user.email} />
          <ReadOnlyRow label="Tên hiển thị" value={user.fullName ?? "Chưa đặt"} />
        </div>
      </Section>

      <Section title="Giờ nhắc mặc định" meta="UTC+7">
        <RemindTimeForm defaultValue={user.defaultRemindTime} />
      </Section>

      <Section title="Kiểm tra gửi email">
        <TestEmailForm />
      </Section>

      <Section title="Remio gửi email thế nào">
        <div className="flex max-w-xl flex-col gap-4 text-ink-soft">
          <p>
            Supabase pg_cron gọi endpoint nhắc nhở mỗi 15 phút. Mỗi lời nhắc chỉ
            được gửi một lần cho một ngày, kể cả khi cron chạy lặp hoặc chạy song
            song.
          </p>
          <p>
            Nếu cron bị bỏ lỡ, ví dụ website vừa deploy lại, Remio vẫn gửi bù
            trong vòng 24 giờ.
          </p>
          <p>
            Gmail giới hạn khoảng 500 email mỗi ngày. Khi cần nhiều hơn, lớp gửi
            mail trong mã nguồn đã sẵn sàng để chuyển sang nhà cung cấp khác.
          </p>
        </div>
      </Section>
    </PageContainer>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader eyebrow="Cài đặt" title="Tài khoản và nhắc nhở" />
          <div className="h-64 animate-pulse border-t border-rule bg-ink/4" />
        </PageContainer>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
