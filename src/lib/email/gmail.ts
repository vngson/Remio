import { createTransport, type Transporter } from "nodemailer";
import { gmailAppPassword, gmailUser } from "@/lib/env";
import type { EmailMessage, EmailProvider } from "./provider";

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (!transport) {
    transport = createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser(),
        // Google hiển thị App Password theo nhóm 4 ký tự ("abcd efgh ijkl mnop")
        // nhưng phần xác thực chỉ nhận 16 ký tự liền nhau.
        pass: gmailAppPassword().replace(/\s+/g, ""),
      },
    });
  }
  return transport;
}

/**
 * Gmail SMTP chỉ cho phép gửi từ chính địa chỉ Gmail đã xác thực (hoặc alias
 * "Send mail as"), và giới hạn khoảng 500 người nhận mỗi ngày.
 */
export function createGmailProvider(): EmailProvider {
  const from = gmailUser();

  return {
    async send(message: EmailMessage) {
      const info = await getTransport().sendMail({
        from: `Remio <${from}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return { id: info.messageId };
    },
  };
}
