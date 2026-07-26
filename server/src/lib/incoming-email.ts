import prisma from "../db";
import { sendClassifyJob } from "./classify-ticket";
import { sendAutoResolveJob } from "./auto-resolve-ticket";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

export interface IncomingEmailData {
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  gmailMessageId?: string;
}

export function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

export function parseFromField(from: string): { email: string; name: string } {
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1]!.trim() || match[2]!, email: match[2]! };
  }
  return { name: from, email: from };
}

export async function processIncomingEmail(data: IncomingEmailData) {
  // 1. Check for database idempotency using gmailMessageId
  if (data.gmailMessageId) {
    const existingTicket = await prisma.ticket.findUnique({
      where: { gmailMessageId: data.gmailMessageId },
    });
    if (existingTicket) {
      console.log(`[IncomingEmail] Ticket with gmailMessageId ${data.gmailMessageId} already exists. Skipping creation.`);
      return { type: "ticket", ticket: existingTicket, skipped: true };
    }

    const existingReply = await prisma.reply.findUnique({
      where: { gmailMessageId: data.gmailMessageId },
    });
    if (existingReply) {
      console.log(`[IncomingEmail] Reply with gmailMessageId ${data.gmailMessageId} already exists. Skipping creation.`);
      const ticket = await prisma.ticket.findUnique({ where: { id: existingReply.ticketId } });
      return { type: "reply", ticket: ticket!, reply: existingReply, skipped: true };
    }
  }

  const normalizedSubject = stripSubjectPrefixes(data.subject);

  // Check for existing open ticket from same sender with matching subject (threading replies)
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      senderEmail: data.fromEmail,
      status: { notIn: ["resolved", "closed"] },
      subject: { equals: normalizedSubject, mode: "insensitive" },
    },
  });

  if (existingTicket) {
    const reply = await prisma.reply.create({
      data: {
        body: data.body,
        bodyHtml: data.bodyHtml ?? null,
        senderType: "customer",
        ticketId: existingTicket.id,
        userId: null,
        gmailMessageId: data.gmailMessageId ?? null,
      },
    });

    sendAutoResolveJob(existingTicket).catch((error) =>
      console.error(`Failed to enqueue auto-resolve job for existing ticket ${existingTicket.id}:`, error)
    );

    return { type: "reply", ticket: existingTicket, reply };
  }

  // Find matched client by sender email domain
  const senderDomain = data.fromEmail.split("@")[1]?.toLowerCase();
  let matchedClient = null;
  let targetWorkspaceId = null;

  if (senderDomain) {
    matchedClient = await prisma.client.findFirst({
      where: {
        emailDomains: { has: senderDomain },
      },
    });
    if (matchedClient) {
      targetWorkspaceId = matchedClient.workspaceId;
    }
  }

  if (!targetWorkspaceId) {
    const firstWorkspace = await prisma.workspace.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (firstWorkspace) {
      targetWorkspaceId = firstWorkspace.id;
    } else {
      console.warn("No workspace found to assign incoming email ticket. Skipping.");
      return;
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: normalizedSubject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.fromName,
      senderEmail: data.fromEmail,
      assignedToId: AI_AGENT_ID,
      workspaceId: targetWorkspaceId,
      clientId: matchedClient ? matchedClient.id : null,
      gmailMessageId: data.gmailMessageId ?? null,
    },
  });

  sendClassifyJob(ticket).catch((error) =>
    console.error(`Failed to enqueue classify job for ticket ${ticket.id}:`, error)
  );

  sendAutoResolveJob(ticket).catch((error) =>
    console.error(`Failed to enqueue auto-resolve job for ticket ${ticket.id}:`, error)
  );

  return { type: "ticket", ticket };
}
