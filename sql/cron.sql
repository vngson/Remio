-- Cấu hình cron cho Remio.
-- Chạy một lần trong Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- Trước khi chạy, thay hai giá trị:
--   <DOMAIN>       -> domain production, ví dụ: remio.vercel.app
--   <CRON_SECRET>  -> đúng giá trị CRON_SECRET trong biến môi trường của Vercel

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Xoá lịch cũ nếu chạy lại script này.
select cron.unschedule('remio-reminders')
where exists (
  select 1 from cron.job where jobname = 'remio-reminders'
);

-- Chạy mỗi 15 phút. Múi giờ của pg_cron là UTC, nhưng logic trong endpoint
-- luôn tính theo giờ Việt Nam (UTC+7) nên không cần chỉnh gì thêm.
select cron.schedule(
  'remio-reminders',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://<DOMAIN>/api/cron/reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<CRON_SECRET>'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $$
);

-- Kiểm tra lịch đã đăng ký:
--   select jobid, jobname, schedule, active from cron.job;
-- Xem phản hồi của các lần gọi gần nhất:
--   select status_code, content, created from net._http_response order by created desc limit 10;
