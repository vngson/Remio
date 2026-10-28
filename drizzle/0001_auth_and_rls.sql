-- Ràng buộc khoá ngoại tới auth.users (bảng do Supabase quản lý).
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "events"
  ADD CONSTRAINT "events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "reminders_log"
  ADD CONSTRAINT "reminders_log_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "reminders_log"
  ADD CONSTRAINT "reminders_log_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- Ràng buộc miền giá trị: dữ liệu lịch sai sẽ khiến cron gửi nhắc sai ngày.
ALTER TABLE "events"
  ADD CONSTRAINT "events_calendar_type_check"
  CHECK ("calendar_type" IN ('solar', 'lunar'));
--> statement-breakpoint
ALTER TABLE "events"
  ADD CONSTRAINT "events_recurrence_check"
  CHECK ("recurrence" IN ('yearly', 'once', 'monthly', 'weekly'));
--> statement-breakpoint
ALTER TABLE "events"
  ADD CONSTRAINT "events_category_check"
  CHECK ("category" IN ('birthday', 'anniversary', 'death_anniversary', 'holiday', 'other'));
--> statement-breakpoint
ALTER TABLE "events"
  ADD CONSTRAINT "events_schedule_check"
  CHECK (
    (
      "recurrence" = 'yearly'
      AND "month" IS NOT NULL
      AND "day" IS NOT NULL
      AND "month" BETWEEN 1 AND 12
      AND "day" BETWEEN 1 AND (CASE WHEN "calendar_type" = 'lunar' THEN 30 ELSE 31 END)
    )
    OR (
      "recurrence" <> 'yearly'
      AND "anchor_date" IS NOT NULL
      AND "month" IS NULL
      AND "day" IS NULL
    )
  );
--> statement-breakpoint
-- Âm lịch chỉ có ý nghĩa với sự kiện lặp hằng năm.
ALTER TABLE "events"
  ADD CONSTRAINT "events_lunar_yearly_check"
  CHECK ("calendar_type" <> 'lunar' OR "recurrence" = 'yearly');
--> statement-breakpoint
ALTER TABLE "events"
  ADD CONSTRAINT "events_leap_month_check"
  CHECK ("calendar_type" = 'lunar' OR "leap_month" = false);
--> statement-breakpoint
ALTER TABLE "events"
  ADD CONSTRAINT "events_remind_days_check"
  CHECK (
    array_length("remind_days_before", 1) >= 1
    AND 0 <= ALL("remind_days_before")
    AND 60 >= ALL("remind_days_before")
  );
--> statement-breakpoint
ALTER TABLE "reminders_log"
  ADD CONSTRAINT "reminders_log_status_check"
  CHECK ("status" IN ('pending', 'sent', 'failed'));
--> statement-breakpoint

-- Tự động cập nhật updated_at.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "profiles_set_updated_at"
  BEFORE UPDATE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "events_set_updated_at"
  BEFORE UPDATE ON "events"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- Tạo hồ sơ khi người dùng đăng ký lần đầu qua Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    )
  )
  ON CONFLICT ("id") DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- Row Level Security: lớp bảo vệ bổ sung. Ứng dụng truy cập qua role postgres
-- (bỏ qua RLS) và luôn lọc theo user_id, nhưng RLS bảo vệ mọi truy cập
-- anon/authenticated trong tương lai.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "reminders_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT TO authenticated USING ("id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE TO authenticated
  USING ("id" = (SELECT auth.uid()))
  WITH CHECK ("id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "events_select_own" ON "events"
  FOR SELECT TO authenticated USING ("user_id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "events_insert_own" ON "events"
  FOR INSERT TO authenticated WITH CHECK ("user_id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "events_update_own" ON "events"
  FOR UPDATE TO authenticated
  USING ("user_id" = (SELECT auth.uid()))
  WITH CHECK ("user_id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "events_delete_own" ON "events"
  FOR DELETE TO authenticated USING ("user_id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "reminders_log_select_own" ON "reminders_log"
  FOR SELECT TO authenticated USING ("user_id" = (SELECT auth.uid()));
