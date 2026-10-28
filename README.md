# Remio

**Sổ ngày kỷ niệm cho người Việt.** Ghi lại ngày giỗ, sinh nhật, kỷ niệm theo
dương lịch hoặc âm lịch. Remio tự tính lại ngày cho từng năm và gửi email nhắc
bạn trước ngày đó.

<sub>Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase · Drizzle ORM · Nodemailer</sub>

---

## Mục lục

- [Tính năng](#tính-năng)
- [Kiến trúc](#kiến-trúc)
- [Luồng nhắc nhở](#luồng-nhắc-nhở)
- [Bắt đầu](#bắt-đầu)
- [Triển khai](#triển-khai)
- [Kiểm thử](#kiểm-thử)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Ghi chú kỹ thuật](#ghi-chú-kỹ-thuật)
- [Xử lý sự cố](#xử-lý-sự-cố)

## Tính năng

**Ngày và lịch**

- Sự kiện lặp **hằng năm** theo dương lịch hoặc âm lịch, cùng các kiểu **một lần**, **hằng tháng**, **hằng tuần**.
- Âm lịch tính theo chuẩn Việt Nam (thuật toán Hồ Ngọc Đức, UTC+7), xử lý đúng **tháng nhuận**.
- Tự điều chỉnh các trường hợp biên: 29/02 ở năm không nhuận, ngày 30 âm ở tháng chỉ có 29 ngày, ngày 31 ở tháng thiếu.
- Tờ lịch tháng hiện song song ngày dương và ngày âm; ngày có sự kiện được tô màu và in tên ngay trong ô.

**Nhắc nhở**

- Mỗi sự kiện có **giờ gửi riêng** và **nhiều mốc nhắc** (trước 7, 3, 1 ngày và đúng ngày).
- Email nhắc hiển thị cả ngày dương lẫn ngày âm, kèm số ngày còn lại.
- Gửi bù trong 24 giờ nếu cron bị bỏ lỡ; mỗi lời nhắc chỉ gửi **một lần** cho một ngày.

**Tài khoản**

- Đăng nhập bằng email kèm **mã OTP 6 số**, không cần mật khẩu. Người dùng cũng có thể bấm liên kết trong email.
- Mọi dữ liệu cá nhân được lọc theo `user_id`, có Row Level Security làm lớp bảo vệ bổ sung.
- Giao diện tiếng Việt, sáng/tối, tối ưu cho điện thoại.

## Kiến trúc

| Thành phần | Lựa chọn |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components) + TypeScript |
| Giao diện | Tailwind CSS v4 · Newsreader (serif) + Be Vietnam Pro (UI) · Lucide |
| Auth | Supabase Auth (email OTP) qua `@supabase/ssr` |
| Database | Supabase Postgres, schema và migration bằng Drizzle ORM |
| Email | Gmail SMTP qua Nodemailer, có lớp trừu tượng để đổi nhà cung cấp |
| Cron | Supabase `pg_cron` + `pg_net` gọi endpoint nội bộ mỗi 15 phút |
| Múi giờ | Cố định `Asia/Ho_Chi_Minh` (UTC+7) |

```
        mỗi 15 phút
┌──────────────┐   HTTP POST    ┌────────────────────────────┐
│  Supabase    │ ─────────────▶ │  Next.js                   │
│  pg_cron     │  x-cron-secret │  POST /api/cron/reminders  │
└──────────────┘                └──────────────┬─────────────┘
                                               │
                     ┌─────────────────────────┼──────────────────────┐
                     ▼                         ▼                      ▼
              ┌─────────────┐          ┌───────────────┐      ┌──────────────┐
              │  Postgres   │          │ reminders_log │      │ Gmail SMTP   │
              │  events     │          │ (chống trùng) │      │ → hộp thư    │
              └─────────────┘          └───────────────┘      └──────────────┘
```

> Ứng dụng **không** dùng Vercel Cron: mỗi sự kiện có giờ gửi riêng nên cần cron
> chạy dày, mà Vercel Hobby giới hạn 1 lần/ngày. `pg_cron` của Supabase chạy mỗi
> 15 phút và gọi vào endpoint của app.

## Luồng nhắc nhở

1. `pg_cron` gọi `POST /api/cron/reminders` kèm header `x-cron-secret`.
2. Endpoint tính các lời nhắc đã tới hạn theo giờ Việt Nam. Một lời nhắc tới hạn khi `sendAt <= now` và chưa quá **cửa sổ gửi bù 24 giờ**.
3. Trước khi gửi, một dòng được chèn vào `reminders_log`. Ràng buộc UNIQUE trên `(event_id, occurrence_date, days_before, channel)` bảo đảm hai lần chạy song song chỉ gửi được một email.
4. Gửi thành công thì cập nhật `status = 'sent'`. Gửi lỗi thì đánh dấu `failed`, và lần chạy sau được phép giành lại bản ghi đó để thử tiếp.

Nhờ vậy endpoint là **idempotent**: gọi lại bao nhiêu lần cũng an toàn.

## Bắt đầu

### 1. Biến môi trường

```bash
cp .env.example .env.local
```

Next.js và drizzle-kit đều đọc `.env.local` lẫn `.env` (`.env.local` được ưu tiên).

| Biến | Mô tả |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL công khai, dùng để tạo liên kết trong email nhắc |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `DATABASE_URL` | Postgres qua **transaction pooler, cổng 6543** — dùng khi app chạy |
| `DIRECT_URL` | **Session pooler, cổng 5432** — chỉ dùng khi chạy migration |
| `CRON_SECRET` | Chuỗi bí mật cho endpoint cron (`openssl rand -hex 32`) |
| `GMAIL_USER` | Địa chỉ Gmail dùng để gửi email nhắc |
| `GMAIL_APP_PASSWORD` | App Password 16 ký tự của Gmail |

### 2. Supabase

1. Tạo project tại [supabase.com](https://supabase.com).
2. Lấy `Project URL`, key và chuỗi kết nối trong Settings → Database:
   - `DATABASE_URL`: transaction pooler, cổng **6543**.
   - `DIRECT_URL`: session pooler, cổng **5432**.
3. Kiểm tra kết nối:

```bash
npm run db:check
```

Lệnh này in ra máy chủ đang kết nối, dịch mã lỗi thành gợi ý, và tự thử cổng 5432
để chỉ ra `DIRECT_URL` còn thiếu.

4. Áp schema:

```bash
npm run db:migrate
```

Migration tạo bảng, khoá ngoại tới `auth.users`, check constraints, trigger tạo
hồ sơ khi đăng ký, và bật Row Level Security.

> **Đừng chạy migration qua cổng 6543.** Transaction pooler không phù hợp với DDL
> và có thể khiến `drizzle-kit migrate` treo ở dòng "applying migrations...".

### 3. Đăng nhập bằng email + mã OTP

**a. Bật provider Email** — Supabase → Authentication → Providers → **Email**.

**b. Thêm `{{ .Token }}` vào template email.** Mặc định Supabase chỉ gửi liên kết,
không gửi mã số. Sửa cả hai template (Authentication → Email Templates):

- **Confirm signup** — dùng khi email chưa tồn tại
- **Magic Link** — dùng khi email đã có tài khoản

```html
<h2>Mã đăng nhập Remio của bạn</h2>
<p>Dùng mã sau để đăng nhập:</p>
<p style="font-size: 28px; letter-spacing: 6px"><b>{{ .Token }}</b></p>
<p>Mã có hiệu lực trong ít phút.</p>
```

Thiếu `{{ .Token }}` thì người dùng nhận được email nhưng không có mã để nhập.

**c. Cấu hình SMTP riêng cho Supabase.** Mailer mặc định chỉ cho vài email mỗi
giờ nên không dùng thật được. Authentication → **SMTP Settings** → *Enable Custom
SMTP*:

| Trường | Giá trị |
| --- | --- |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | địa chỉ Gmail của bạn |
| Password | App Password (16 ký tự) |
| Sender email | đúng địa chỉ Gmail đó |
| Sender name | `Remio` |

Sau đó vào Authentication → **Rate Limits** để nâng *Rate limit for sending
emails* (mặc định 30/giờ).

**d. URL Configuration.** Authentication → URL Configuration:

- **Site URL**: `http://localhost:3002` khi phát triển, domain thật khi deploy.
- **Redirect URLs**: thêm `http://localhost:3002/**` và `https://<domain>/**`.

> Supabase chỉ chấp nhận redirect về URL nằm trong danh sách cho phép. Nếu không
> khớp, nó **âm thầm quay về Site URL** — đó là lý do liên kết trong email trỏ sai
> cổng dù mã nguồn không hardcode cổng nào. App đã gửi kèm `emailRedirectTo` theo
> origin thật của trình duyệt, nhưng danh sách cho phép vẫn phải chứa origin đó.

### 4. Gmail (cho email nhắc)

1. Bật xác thực 2 bước cho tài khoản Google.
2. Tạo **App Password** tại <https://myaccount.google.com/apppasswords>.
3. Điền vào `GMAIL_USER` và `GMAIL_APP_PASSWORD`.

> App Password dán kèm khoảng trắng (`abcd efgh ijkl mnop`) vẫn dùng được: Remio
> tự bỏ khoảng trắng trước khi xác thực.
> Gmail chỉ cho gửi từ chính địa chỉ đã xác thực (hoặc alias "Send mail as") và
> giới hạn khoảng 500 người nhận mỗi ngày.

### 5. Chạy

```bash
npm run dev          # http://localhost:3002
```

## Triển khai

**Phải deploy thì mới có email.** Dữ liệu nằm ở Supabase nên không mất, nhưng
email nhắc do ứng dụng gửi. Tắt web hoặc không deploy thì `pg_cron` gọi vào đâu
cũng không được và sẽ không có email nào.

1. Deploy lên một nơi chạy 24/7 (Vercel gói free là đủ).
2. Khai đủ biến môi trường ở [mục 1](#1-biến-môi-trường), với
   `NEXT_PUBLIC_SITE_URL` là domain thật.
3. Chạy `sql/cron.sql` **một lần** trong Supabase SQL Editor, thay `<DOMAIN>` bằng
   domain vừa deploy và `<CRON_SECRET>` bằng secret thật. Script này cài luôn
   `pg_cron` + `pg_net` và tạo lịch chạy mỗi 15 phút.
4. Vào Cài đặt của bản deploy, bấm **Gửi email thử** để xác nhận Gmail SMTP thông
   từ môi trường serverless.
5. Kiểm tra lại lịch và phản hồi:

```sql
select jobid, jobname, schedule, active from cron.job;
select status_code, created from net._http_response order by created desc limit 10;
```

Sau đó tắt máy cũng không ảnh hưởng: Supabase và Vercel chạy độc lập.

> **Gói free của Supabase có thể tạm dừng project** sau một thời gian không có hoạt
> động. Project dừng thì cron cũng dừng. Nếu cần nhắc chắc chắn trong nhiều năm, nên
> dùng gói trả phí hoặc kiểm tra định kỳ.

## Kiểm thử

```bash
npm test             # vitest — âm lịch, sinh ngày, tính thời điểm gửi, SQL chống trùng
npm run typecheck    # next typegen + tsc
npm run lint         # eslint
npm run db:check     # kiểm tra kết nối database
```

Phần âm lịch được kiểm chứng khá kỹ:

- Đối chiếu 4.000+ mốc đã biết: ngày Tết 2020–2035, rằm Trung thu, giao thừa.
- Chạy round-trip cho **mọi ngày** trong giai đoạn 2020–2030.
- Đối chiếu chéo với một bản cài đặt Hồ Ngọc Đức độc lập trên 9.497 ngày (2015–2040): 0 sai lệch.
- Kiểm tra riêng quy tắc tháng nhuận, ngày 30 âm rơi vào tháng 29 ngày, và 29/02 ở năm không nhuận.

**Kiểm thử thủ công**

1. Vào `/login`, nhập email → nhận mã → đăng nhập.
2. Thêm một sự kiện âm lịch với nhắc trước 1 ngày và đúng ngày.
3. Cài đặt → **Gửi email thử** để xác nhận Gmail SMTP.
4. Gọi thử endpoint cron:

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" "$SITE_URL/api/cron/reminders"
```

Kết quả trả về `{ "due": n, "sent": n, "failed": n, "skipped": n }`. Gọi lần thứ hai
ngay sau đó sẽ thấy `sent: 0` và `skipped` tăng — đó là cơ chế chống gửi trùng.

## Cấu trúc thư mục

```
src/
  app/
    (app)/            # Khu vực đã đăng nhập: dashboard, events, calendar, settings
    api/cron/         # Endpoint nhắc nhở cho pg_cron
    auth/callback/    # Nhận liên kết đăng nhập trong email (code / token_hash)
    login/            # Trang đăng nhập (email + mã OTP)
    page.tsx          # Landing page
  components/
    app/              # Khung ứng dụng: nav, theme toggle, user panel
    events/           # Form, dòng sự kiện, hộp thoại xoá
    lunar/            # Tờ lịch tháng dương + âm
    ui/               # Design system dùng chung
  db/                 # Drizzle schema và client
  lib/
    dates.ts          # Tiện ích ngày dương lịch, múi giờ UTC+7 cố định
    lunar/            # Thuật toán âm lịch + sinh ngày xảy ra sự kiện
    events/           # Zod schema, truy vấn, server actions
    email/            # Lớp gửi mail và template email
    scheduler/        # Tính thời điểm gửi (hàm thuần), chống trùng, gửi email
  proxy.ts            # Next.js 16 Proxy (trước đây là middleware)
drizzle/              # Migration sinh bởi drizzle-kit
scripts/check-db.mjs  # Chẩn đoán kết nối database
sql/cron.sql          # Cấu hình pg_cron + pg_net
```

## Ghi chú kỹ thuật

- **Âm lịch**: `src/lib/lunar/vn-lunar.ts` cài đặt thuật toán Hồ Ngọc Đức, không
  phụ thuộc thư viện ngoài. Không dùng `lunar-javascript` hay các thư viện bám
  UTC+8 vì sẽ lệch ngày so với lịch Việt Nam ở các thời điểm sát ranh giới.
- **Múi giờ**: cố định UTC+7 nên mọi phép tính "giờ tường" chỉ cần một offset hằng
  số, không cần thư viện timezone. Muốn phục vụ người dùng nước ngoài thì thêm cột
  `timezone` cho `profiles` và tính lại theo từng người.
- **Cache Components**: Next.js 16 bật `cacheComponents`, nên mọi trang đọc dữ liệu
  runtime đều nằm trong `<Suspense>`. `getCurrentUser()` gọi `connection()` trước khi
  đọc session vì supabase-js dùng `Date.now()` (Next coi là giá trị không ổn định).
- **RLS**: đã bật cho `events`, `profiles`, `reminders_log`. Ứng dụng truy cập
  database qua role `postgres` (bỏ qua RLS) và **luôn** lọc theo `user_id`; RLS là
  lớp bảo vệ bổ sung cho mọi truy cập client trong tương lai.
- **Giao diện**: hướng "lịch bloc" — giấy in, mực đen, đỏ son chỉ dùng để đánh dấu
  ngày đặc biệt. Không dùng card bo tròn hay đổ bóng; phân tầng bằng đường kẻ mảnh.

## Xử lý sự cố

| Hiện tượng | Nguyên nhân và cách sửa |
| --- | --- |
| `drizzle-kit migrate` treo ở "applying migrations..." | Đang dùng cổng 6543 cho DDL. Đặt `DIRECT_URL` trỏ tới cổng 5432. |
| `28P01 password authentication failed` | Sai mật khẩu database. Reset ở Project Settings → Database rồi dán lại. Mật khẩu chứa `@ # ? / : %` phải percent-encode trong URL. |
| `ENOTFOUND` / `ETIMEDOUT` | Sai host, hoặc project Supabase đang tạm dừng. |
| `3D000 database does not exist` | Sai tên database ở cuối URL (thường là `postgres`). |
| Không nhận được email nhắc | Kiểm tra `GMAIL_USER` / `GMAIL_APP_PASSWORD` bằng nút **Gửi email thử**, và xem hộp thư rác. |
| Không nhận được mã đăng nhập | Chưa thêm `{{ .Token }}` vào template *Confirm signup* và *Magic Link*. Xem [mục 3b](#3-đăng-nhập-bằng-email--mã-otp). |
| Bấm gửi mã, Supabase trả `429 over_email_send_rate_limit` | Vượt hạn mức gửi email. Bật Custom SMTP và nâng *Rate limit for sending emails*. |
| `verifyOtp` báo "Token has expired or is invalid" | Mã sai/hết hạn, hoặc email nhập khác email đã yêu cầu. Mã mặc định hiệu lực 1 giờ. |
| Liên kết trong email trỏ về `localhost:3000` | Site URL trong Supabase vẫn là mặc định. Xem [mục 3d](#3-đăng-nhập-bằng-email--mã-otp). |
| Đã cài sự kiện nhưng không có email nào | Chưa deploy hoặc chưa chạy `sql/cron.sql`. Xem [Triển khai](#triển-khai). |
