import type { PgBoss } from "pg-boss";
import prisma from "../db";
import { sendEmailJob, getClientUrl } from "./send-email";
import Sentry from "./sentry";

const QUEUE_NAME = "resolve-linked-ticket";

interface ResolveLinkedTicketJobData {
  ticketId: number;
  taskId: string;
  taskTitle: string;
}

export async function registerResolveLinkedTicketWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await boss.work<ResolveLinkedTicketJobData>(QUEUE_NAME, async (jobs) => {
    const { ticketId, taskTitle } = jobs[0]!.data;

    try {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.status === "resolved" || ticket.status === "closed") {
        return;
      }

      // Mark ticket as resolved
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "resolved" },
      });

      // Add an agent reply summarizing the resolution
      await prisma.reply.create({
        data: {
          ticketId,
          senderType: "agent",
          body:
            `Hi ${ticket.senderName},\n\n` +
            `Great news! The engineering team has completed the work on your issue. ` +
            `The task "${taskTitle}" has been marked as Done.\n\n` +
            `If you have any further questions, feel free to reply to this email.\n\n` +
            `— Launchpit Agency Team`,
        },
      });

      // Send resolution email to customer
      const clientUrl = getClientUrl();
      await sendEmailJob({
        to: ticket.senderEmail,
        subject: `Re: ${ticket.subject} [Resolved]`,
        body:
          `Hi ${ticket.senderName},\n\n` +
          `Great news! The engineering team has resolved your issue. ` +
          `The task "${taskTitle}" has been completed.\n\n` +
          `You can view the ticket details and history here:\n` +
          `${clientUrl}/tickets/${ticket.id}\n\n` +
          `If you have any further questions, feel free to reply.\n\n` +
          `— Launchpit Agency Team`,
      });

      console.log(`[resolve-linked-ticket] Ticket ${ticketId} auto-resolved via task "${taskTitle}"`);
    } catch (error) {
      Sentry.captureException(error, { tags: { queue: QUEUE_NAME, ticketId } });
      throw error;
    }
  });
}

export async function sendResolveLinkedTicketJob(data: ResolveLinkedTicketJobData): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, data);
}
