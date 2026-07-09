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
      const nodemailerTransporter = getTransporter();

      if (nodemailerTransporter) {
        const fromEmail = process.env.SMTP_USER!;
        await nodemailerTransporter.sendMail({
          from: fromEmail,
          to,
          subject,
          text: body,
          ...(bodyHtml && { html: bodyHtml }),
        });
        console.log(`[Nodemailer] Email sent to ${to} — subject: "${subject}"`);
      } else if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
          to,
          from: process.env.SENDGRID_FROM_EMAIL!,
          subject,
          text: body,
          ...(bodyHtml && { html: bodyHtml }),
        });
        console.log(`[SendGrid] Email sent to ${to} — subject: "${subject}"`);
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
