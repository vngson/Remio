import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  /** Định dạng `HH:mm`. */
  defaultRemindTime: string;
}

type ProfileRow = typeof profiles.$inferSelect;

function metaString(user: User, ...keys: string[]): string | null {
  const metadata = user.user_metadata ?? {};
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

async function findProfile(userId: string): Promise<ProfileRow | null> {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Trigger `handle_new_user` tạo hồ sơ khi đăng ký, nhưng người dùng tạo trước
 * khi trigger tồn tại sẽ thiếu hồ sơ — tự bù lại ở đây.
 */
async function ensureProfile(user: User): Promise<ProfileRow | null> {
  const existing = await findProfile(user.id);
  if (existing) {
    return existing;
  }

  await db
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email ?? "",
      fullName: metaString(user, "full_name", "name"),
      avatarUrl: metaString(user, "avatar_url", "picture"),
    })
    .onConflictDoNothing();

  return findProfile(user.id);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // supabase.auth.getUser() đọc Date.now() để kiểm tra hạn token. Next.js coi
  // đó là giá trị không ổn định nên chặn nếu việc render diễn ra lúc prerender.
  // `connection()` buộc phần này chỉ chạy ở thời điểm có request.
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await ensureProfile(user);
  if (!profile) {
    return null;
  }

  return {
    id: user.id,
    email: profile.email,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    defaultRemindTime: profile.defaultRemindTime.slice(0, 5),
  };
});

/** Dùng trong Server Component và Server Action; chuyển hướng nếu chưa đăng nhập. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
