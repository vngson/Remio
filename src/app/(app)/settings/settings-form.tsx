"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  sendTestEmailAction,
  updateRemindTimeAction,
  type SettingsState,
} from "./actions";

const IDLE: SettingsState = { status: "idle" };

function StatusNote({ state }: { state: SettingsState }) {
  if (state.status === "idle") {
    return null;
  }
  return (
    <p
      className={
        state.status === "success"
          ? "border-l-2 border-ngoc py-1 pl-4 text-[0.8125rem] text-ngoc"
          : "border-l-2 border-son py-1 pl-4 text-[0.8125rem] text-son"
      }
    >
      {state.message}
    </p>
  );
}

export function RemindTimeForm({ defaultValue }: { defaultValue: string }) {
  const [state, formAction, pending] = useActionState(
    updateRemindTimeAction,
    IDLE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        label="Giờ nhắc mặc định"
        htmlFor="defaultRemindTime"
        hint="Áp dụng cho sự kiện mới. Mỗi sự kiện vẫn có thể đặt giờ riêng."
        className="sm:max-w-56"
      >
        <Input
          id="defaultRemindTime"
          name="defaultRemindTime"
          type="time"
          required
          defaultValue={defaultValue}
        />
      </Field>

      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Lưu giờ nhắc
        </Button>
      </div>

      <StatusNote state={state} />
    </form>
  );
}

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<SettingsState>(IDLE);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 6) {
      setState({ status: "error", message: "Mật khẩu cần ít nhất 6 ký tự." });
      return;
    }
    if (password !== confirm) {
      setState({ status: "error", message: "Hai lần nhập không khớp." });
      return;
    }

    setPending(true);
    setState(IDLE);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      setPassword("");
      setConfirm("");
      setState({
        status: "success",
        message:
          "Đã lưu mật khẩu. Lần sau bạn đăng nhập bằng email và mật khẩu này.",
      });
    } catch (failure) {
      setState({
        status: "error",
        message:
          failure instanceof Error
            ? failure.message
            : "Không đặt được mật khẩu.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field
        label="Mật khẩu mới"
        htmlFor="new-password"
        hint="Ít nhất 6 ký tự."
        className="sm:max-w-56"
      >
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Field
        label="Nhập lại mật khẩu"
        htmlFor="confirm-password"
        className="sm:max-w-56"
      >
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </Field>

      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Lưu mật khẩu
        </Button>
      </div>

      <StatusNote state={state} />
    </form>
  );
}

export function TestEmailForm() {
  const [state, formAction, pending] = useActionState(
    sendTestEmailAction,
    IDLE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p className="max-w-xl text-ink-soft">
        Gửi một email mẫu tới hộp thư của bạn để kiểm tra cấu hình Gmail SMTP
        trước khi chờ tới ngày nhắc thật.
      </p>
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Gửi email thử
        </Button>
      </div>
      <StatusNote state={state} />
    </form>
  );
}
