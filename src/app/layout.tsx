import type { Metadata } from "next";
import { Be_Vietnam_Pro, Newsreader } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

/** Serif cho ngày tháng và tiêu đề: giọng của một tờ lịch in. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/** Sans cho giao diện: dấu tiếng Việt rõ ở cỡ nhỏ. */
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Remio — Sổ ngày kỷ niệm",
    template: "%s · Remio",
  },
  description:
    "Ghi lại ngày kỷ niệm, sinh nhật, ngày giỗ theo dương lịch hoặc âm lịch. Remio tự tính lại ngày âm mỗi năm và gửi email nhắc bạn đúng giờ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${newsreader.variable} ${beVietnamPro.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
