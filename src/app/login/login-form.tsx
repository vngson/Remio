"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 6;

type Mode = "password" | "code";
type PasswordStep = "signin" | "signup";

const MODES = [
  { value: "password" as const, label: "Mật khẩu" },
  { value: "code" as const, label: "Mã qua email" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function messageFor(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/invalid login credentials/i.test(raw)) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "Tài khoản chưa xác nhận. Mở email xác nhận, hoặc đăng nhập bằng mã.";
  }
  if (/user already registered|already been registered/i.test(raw)) {
    return "Email này đã có tài khoản. Chuyển sang Đăng nhập.";
  }
  if (/password should be at least|password.*(short|length)/i.test(raw)) {
    return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  }
  if (/rate limit|too many|security purposes|after \d+ seconds/i.test(raw)) {
    return "Đã vượt hạn mức gửi email của Supabase. Chờ khoảng một giờ, hoặc bật Custom SMTP trong Supabase.";
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

function Note({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "info";
}) {
  return (
    <p
      className={
        tone === "error"
          ? "rounded-slip border border-son/45 px-4 py-3 text-[0.8125rem] text-son"
          : "rounded-slip border border-rule px-4 py-3 text-[0.8125rem] text-ink-soft"
      }
    >
      {children}
    </p>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [passwordStep, setPasswordStep] = useState<PasswordStep>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const address = email.trim().toLowerCase();

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

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  function validateEmail(): boolean {
    if (!EMAIL_PATTERN.test(address)) {
      setError("Email không hợp lệ.");
      return false;
    }
    return true;
  }

  function validatePassword(): boolean {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return false;
    }
    return true;
  }

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    resetMessages();
    if (!validateEmail() || !validatePassword()) {
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: address,
        password,
      });
      if (signInError) {
        throw signInError;
      }
      window.location.assign(next);
    } catch (failure) {
      setError(messageFor(failure));
      setPending(false);
    }
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    resetMessages();
    if (!validateEmail() || !validatePassword()) {
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: address,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
        },
      });
      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        window.location.assign(next);
        return;
      }

      setPassword("");
      setPasswordStep("signin");
      setNotice(
        `Đã tạo tài khoản. Mở email để xác nhận ${address}, sau đó đăng nhập bằng mật khẩu vừa đặt.`,
      );
      toast.success("Đã tạo tài khoản");
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    resetMessages();
    if (!validateEmail()) {
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
        },
      });
      if (otpError) {
        throw otpError;
      }
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(event ? "Đã gửi email đăng nhập" : "Đã gửi lại email");
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    resetMessages();
    const token = code.replace(/\D/g, "");
    if (token.length !== CODE_LENGTH) {
      setError(`Mã gồm ${CODE_LENGTH} chữ số.`);
      return;
    }

    setPending(true);
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
    } catch (failure) {
      setError(messageFor(failure));
      setPending(false);
    }
  }

  function switchMode(value: Mode) {
    setMode(value);
    resetMessages();
  }

  return (
    <div className="flex flex-col gap-6">
      <Segmented options={MODES} value={mode} onChange={switchMode} />

      {mode === "password" ? (
        passwordStep === "signin" ? (
          <form onSubmit={signInWithPassword} className="flex flex-col gap-6" noValidate>
            <Field label="Email" htmlFor="signin-email">
              <Input
                id="signin-email"
                name="signin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="ban@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field label="Mật khẩu" htmlFor="signin-password">
              <Input
                id="signin-password"
                name="signin-password"
                type="password"
                autoComplete="current-password"
                required
                placeholder={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {error ? <Note>{error}</Note> : null}
            {notice ? <Note tone="info">{notice}</Note> : null}

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {pending ? "Đang đăng nhập" : "Đăng nhập"}
            </Button>

            <div className="flex flex-col gap-2 text-[0.8125rem] text-ink-faint">
              <button
                type="button"
                className="w-fit underline underline-offset-4 hover:text-ink"
                onClick={() => {
                  setPasswordStep("signup");
                  resetMessages();
                }}
              >
                Chưa có tài khoản? Tạo tài khoản
              </button>
              <button
                type="button"
                className="w-fit underline underline-offset-4 hover:text-ink"
                onClick={() => switchMode("code")}
              >
                Quên mật khẩu? Đăng nhập bằng mã
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={signUp} className="flex flex-col gap-6" noValidate>
            <Field
              label="Tên của bạn"
              htmlFor="signup-name"
              hint="Không bắt buộc. Dùng để Remio xưng hô trong email nhắc."
            >
              <Input
                id="signup-name"
                name="signup-name"
                autoComplete="name"
                placeholder="Nguyễn Văn Sơn"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={80}
              />
            </Field>

            <Field label="Email" htmlFor="signup-email">
              <Input
                id="signup-email"
                name="signup-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="ban@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field
              label="Mật khẩu"
              htmlFor="signup-password"
              hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
            >
              <Input
                id="signup-password"
                name="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {error ? <Note>{error}</Note> : null}
            {notice ? <Note tone="info">{notice}</Note> : null}

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {pending ? "Đang tạo tài khoản" : "Tạo tài khoản"}
            </Button>

            <p className="text-[0.8125rem] text-ink-faint">
              Remio gửi một email xác nhận. Sau khi xác nhận, lần sau bạn đăng
              nhập bằng email và mật khẩu. Đã có tài khoản?{" "}
              <button
                type="button"
                className="underline underline-offset-4 hover:text-ink"
                onClick={() => {
                  setPasswordStep("signin");
                  resetMessages();
                }}
              >
                Đăng nhập
              </button>
            </p>
          </form>
        )
      ) : codeSent ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 bg-son" aria-hidden="true" />
              <span className="label-print text-ink-soft">Đã gửi email</span>
            </div>
            <h2 className="text-2xl">Mở email của bạn</h2>
            <p className="text-ink-soft">
              Remio đã gửi liên kết đăng nhập tới{" "}
              <span className="font-medium text-ink">{address}</span>. Bấm vào
              liên kết đó, hoặc dùng mã 6 số nếu email có kèm.
            </p>
            {address.endsWith("@gmail.com") ? (
              <a
                href="https://mail.google.com/"
                target="_blank"
                rel="noreferrer"
                className="w-fit text-[0.8125rem] font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
              >
                Mở Gmail
              </a>
            ) : null}
          </div>

          {error ? <Note>{error}</Note> : null}

          <form onSubmit={confirmCode} className="flex flex-col gap-4" noValidate>
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
            <Button
              variant="quiet"
              size="sm"
              className="h-auto px-0 py-0"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                resetMessages();
              }}
            >
              Đổi email
            </Button>
            <Button
              variant="quiet"
              size="sm"
              className="h-auto px-0 py-0"
              disabled={pending || cooldown > 0}
              onClick={() => requestCode()}
            >
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
            </Button>
          </div>

          <p className="flex items-center gap-2 text-[0.8125rem] text-ink-faint">
            <Badge variant="quiet">Mẹo</Badge>
            Đăng nhập bằng mã rồi vào Cài đặt để đặt mật khẩu cho lần sau.
          </p>
        </div>
      ) : (
        <form onSubmit={requestCode} className="flex flex-col gap-6" noValidate>
          <Field label="Email" htmlFor="code-email">
            <Input
              id="code-email"
              name="code-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="ban@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          {error ? <Note>{error}</Note> : null}
          {notice ? <Note tone="info">{notice}</Note> : null}

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {pending ? "Đang gửi" : "Gửi liên kết đăng nhập"}
          </Button>

          <p className="text-[0.8125rem] text-ink-faint">
            Dùng khi quên mật khẩu, hoặc khi tài khoản chưa đặt mật khẩu.
          </p>
        </form>
      )}
    </div>
  );
}
