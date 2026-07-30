import type { PgBoss } from "pg-boss";
import Sentry from "./sentry";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const QUEUE_NAME = "send-email";

interface SendEmailJobData {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
}

// Lazy-loaded nodemailer transporter
let transporter: nodemailer.Transporter | null = null;

async function getGoogleAccessToken(): Promise<string | null> {
  const clientId = process.env.SMTP_CLIENT_ID;
  const clientSecret = process.env.SMTP_CLIENT_SECRET;
  const refreshToken = process.env.SMTP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  } catch (err) {
    return null;
  }
}

async function sendViaGmailApi(to: string, subject: string, body: string, bodyHtml?: string): Promise<boolean> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return false;

  const fromEmail = process.env.SMTP_USER || process.env.SEED_ADMIN_EMAIL || "me";
  const replyTo = process.env.SMTP_REPLY_TO || fromEmail;

  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    bodyHtml
      ? `Content-Type: text/html; charset=utf-8\r\n\r\n${bodyHtml}`
      : `Content-Type: text/plain; charset=utf-8\r\n\r\n${body}`,
  ];

  const rawMessage = messageParts.join("\r\n");
  const encodedMessage = Buffer.from(rawMessage).toString("base64url");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API send failed: ${response.status} ${response.statusText} - ${errText}`);
  }

  console.log(`[Gmail API] Email sent to ${to} (Reply-To: ${replyTo}) — subject: "${subject}"`);
  return true;
}

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";

  if (!user) return null;

  const authType = process.env.SMTP_AUTH_TYPE;

  if (authType === "OAuth2") {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        type: "OAuth2",
        user,
        clientId: process.env.SMTP_CLIENT_ID,
        clientSecret: process.env.SMTP_CLIENT_SECRET,
        refreshToken: process.env.SMTP_REFRESH_TOKEN,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function registerSendEmailWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await boss.work<SendEmailJobData>(QUEUE_NAME, async (jobs) => {
    const { to, subject, body, bodyHtml } = jobs[0]!.data;

    try {
      // 1. Try Gmail REST API (HTTPS - bypasses blocked SMTP ports in cloud containers)
      if (process.env.SMTP_AUTH_TYPE === "OAuth2" && process.env.SMTP_REFRESH_TOKEN) {
        const sentViaApi = await sendViaGmailApi(to, subject, body, bodyHtml);
        if (sentViaApi) return;
      }

      // 2. Fall back to Nodemailer SMTP
      const nodemailerTransporter = getTransporter();

      if (nodemailerTransporter) {
        const fromEmail = process.env.SMTP_USER!;
        const replyTo = process.env.SMTP_REPLY_TO || fromEmail;
        await nodemailerTransporter.sendMail({
          from: fromEmail,
          to,
          replyTo,
          subject,
          text: body,
          ...(bodyHtml && { html: bodyHtml }),
        });
        console.log(`[Nodemailer] Email sent to ${to} (Reply-To: ${replyTo}) — subject: "${subject}"`);
      } else if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const replyTo = process.env.SENDGRID_REPLY_TO || process.env.SENDGRID_FROM_EMAIL!;
        await sgMail.send({
          to,
          from: process.env.SENDGRID_FROM_EMAIL!,
          replyTo,
          subject,
          text: body,
          ...(bodyHtml && { html: bodyHtml }),
        });
        console.log(`[SendGrid] Email sent to ${to} (Reply-To: ${replyTo}) — subject: "${subject}"`);
      } else {
        console.log(
          `\n========================================\n` +
          `[DEV EMAIL LOG] (No email provider configured in env)\n` +
          `To: ${to}\n` +
          `Subject: ${subject}\n` +
          `Body:\n${body}\n` +
          `========================================\n`
        );
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME },
      });
      console.error("Failed to send email:", error);
      throw error;
    }
  });
}

export async function sendEmailJob(data: SendEmailJobData): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, data);
}

export function getClientUrl(req?: any): string {
  if (req) {
    const origin = req.headers.origin;
    if (origin) return origin;
    const referer = req.headers.referer;
    if (referer) {
      try {
        return new URL(referer).origin;
      } catch (e) {}
    }
  }
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  const origins = process.env.TRUSTED_ORIGINS?.split(",");
  return origins?.[0] || "http://localhost:5173";
}
