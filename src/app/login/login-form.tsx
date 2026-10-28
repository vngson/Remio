"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type Step = "email" | "sent";

function messageFor(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/rate limit|too many|security purposes|after \d+ seconds/i.test(raw)) {
    return "Đã vượt hạn mức gửi email của Supabase. Mailer mặc định chỉ cho vài email mỗi giờ, hãy chờ khoảng một giờ hoặc bật Custom SMTP trong Supabase.";
  }
  if (/expired|invalid/i.test(raw)) {
    return "Mã không đúng hoặc đã hết hạn. Bấm gửi lại để nhận liên kết mới.";
  }
  if (/signups not allowed|not allowed for this instance/i.test(raw)) {
    return "Hệ thống chưa cho phép đăng ký mới.";
  }
  if (/smtp|sending|send.*mail/i.test(raw) && /error|fail|invalid/i.test(raw)) {
    return "Không gửi được email. Kiểm tra cấu hình SMTP trong Supabase.";
  }
  return raw;
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-slip border border-son/45 px-4 py-3 text-[0.8125rem] text-son">
      {children}
    </p>
  );
}

function GmailLink({ email }: { email: string }) {
  if (!email.toLowerCase().endsWith("@gmail.com")) {
    return null;
  }
  return (
    <a
      href="https://mail.google.com/"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
    >
      Mở Gmail
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const address = email.trim().toLowerCase();

  async function requestLink(event?: React.FormEvent) {
    event?.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Email không hợp lệ.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          // Gửi kèm origin thật của trình duyệt, nếu không Supabase dùng
          // "Site URL" trong dashboard và link sẽ trỏ sai cổng.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
        },
      });
      if (otpError) {
        throw otpError;
      }

      setStep("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(event ? "Đã gửi email đăng nhập" : "Đã gửi lại email");
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setPending(false);
    }
  }

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    const token = code.replace(/\D/g, "");

    if (token.length !== CODE_LENGTH) {
      setError(`Mã gồm ${CODE_LENGTH} chữ số.`);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: address,
        token,
        type: "email",
      });
      if (verifyError) {
        throw verifyError;
      }
      window.location.assign(next);
    } catch (verifyFailure) {
      setError(messageFor(verifyFailure));
      setPending(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={requestLink} className="flex flex-col gap-6" noValidate>
        <Field
          label="Tên của bạn"
          htmlFor="fullName"
          hint="Không bắt buộc. Dùng để Remio xưng hô trong email nhắc."
        >
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Nguyễn Văn Sơn"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={80}
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="ban@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {pending ? "Đang gửi" : "Gửi liên kết đăng nhập"}
          </Button>
          <p className="text-[0.8125rem] text-ink-faint">
            Remio gửi cho bạn một liên kết. Nếu chưa có tài khoản, tài khoản sẽ
            được tạo bằng email này.
          </p>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 bg-son" aria-hidden="true" />
          <span className="label-print text-ink-soft">Đã gửi email</span>
        </div>
        <h2 className="text-2xl">Mở email của bạn</h2>
        <p className="text-ink-soft">
          Remio đã gửi một liên kết đăng nhập tới{" "}
          <span className="font-medium text-ink">{address}</span>. Bấm vào liên
          kết trong email để vào Remio.
        </p>
        <GmailLink email={address} />
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <details ref={detailsRef} className="border-t border-rule pt-4">
        <summary className="label-print cursor-pointer list-none text-ink-faint transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block w-3">+</span>
          Email của bạn có kèm mã 6 số
        </summary>

        <form onSubmit={confirmCode} className="mt-5 flex flex-col gap-4" noValidate>
          <Field label={`Mã xác nhận (${CODE_LENGTH} số)`} htmlFor="code">
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={CODE_LENGTH}
              placeholder="······"
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH),
                )
              }
              className="numeral h-12 text-center text-xl tracking-[0.4em]"
            />
          </Field>
          <Button
            type="submit"
            variant="outline"
            disabled={pending || code.length !== CODE_LENGTH}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Xác nhận mã
          </Button>
        </form>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <Button
          variant="quiet"
          size="sm"
          className="h-auto px-0 py-0"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
            if (detailsRef.current) {
              detailsRef.current.open = false;
            }
          }}
        >
          Đổi email
        </Button>

        <Button
          variant="quiet"
          size="sm"
          className="h-auto px-0 py-0"
          disabled={pending || cooldown > 0}
          onClick={() => requestLink()}
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
        </Button>
      </div>

      <p className="flex items-center gap-2 text-[0.8125rem] text-ink-faint">
        <Badge variant="quiet">Mẹo</Badge>
        Nếu không thấy email, kiểm tra thư rác hoặc thư quảng cáo.
      </p>
    </div>
  );
}
