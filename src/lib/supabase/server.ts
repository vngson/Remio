import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Supabase client cho Server Component, Server Action và Route Handler.
 * Việc ghi cookie có thể thất bại khi gọi từ Server Component — trong trường
 * hợp đó `proxy.ts` đảm nhiệm việc làm mới session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Bỏ qua: server component không được phép ghi cookie.
        }
      },
    },
  });
}
