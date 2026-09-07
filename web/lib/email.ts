import nodemailer from "nodemailer";

type AuthEmail = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

export async function sendAuthEmail({ to, subject, heading, body, actionLabel, actionUrl }: AuthEmail) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !password || !from) {
    throw new Error("Transactional email delivery is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass: password,
    },
  });
  const safeUrl = escapeHtml(actionUrl);

  await transporter.sendMail({
    from,
    to,
    subject,
    text: `${heading}\n\n${body}\n\n${actionLabel}: ${actionUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="background:#f4fafb;padding:40px 16px;font-family:Arial,sans-serif;color:#102a33">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d6e5e8;border-radius:20px;padding:40px">
          <div style="font-size:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0f766e">AquaTrace</div>
          <h1 style="margin:20px 0 12px;font-size:28px;line-height:1.2;color:#102a33">${escapeHtml(heading)}</h1>
          <p style="margin:0;color:#49636d;font-size:16px;line-height:1.6">${escapeHtml(body)}</p>
          <a href="${safeUrl}" style="display:inline-block;margin-top:28px;padding:13px 20px;background:#0f766e;border-radius:10px;color:#ffffff;font-weight:700;text-decoration:none">${escapeHtml(actionLabel)}</a>
          <p style="margin:28px 0 0;color:#6b8189;font-size:13px;line-height:1.5">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
}
