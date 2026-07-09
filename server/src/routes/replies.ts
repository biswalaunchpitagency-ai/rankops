import fs from "fs";
import path from "path";
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { parseId } from "../lib/parse-id";
import { generateText } from "ai";
import { aiModel } from "../lib/ai";
import { createReplySchema, polishReplySchema } from "core/schemas/replies.ts";
import prisma from "../db";
import { sendEmailJob } from "../lib/send-email";

const knowledgeBase = fs.readFileSync(
  path.join(import.meta.dirname, "../../knowledge-base.md"),
  "utf-8"
);

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  res.json({ replies });
});

router.post("/", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(createReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const reply = await prisma.reply.create({
    data: {
      body: data.body,
      senderType: "agent",
      ticketId,
      userId: req.user.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await sendEmailJob({
    to: ticket.senderEmail,
    subject: `Re: ${ticket.subject}`,
    body: data.body,
  });

  res.status(201).json(reply);
});

router.post("/summarize", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });

  const conversation = replies
    .map((r) => {
      const sender =
        r.senderType === "agent" ? (r.user?.name ?? "Agent") : ticket.senderName;
      return `${sender}: ${r.body}`;
    })
    .join("\n\n");

  const { text } = await generateText({
    model: aiModel,
    system:
      "You are a helpful assistant that summarizes support ticket conversations. " +
      "Provide a clear, concise summary that captures the customer's issue, any actions taken, and the current status. " +
      "Keep the summary to 2-4 sentences. Return only the summary with no preamble.",
    prompt:
      `Subject: ${ticket.subject}\n\n` +
      `Customer message:\n${ticket.body}\n\n` +
      (conversation ? `Conversation:\n${conversation}` : "No replies yet."),
  });

  res.json({ summary: text });
});

router.post("/suggest", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });

  const conversation = replies
    .map((r) => {
      const sender =
        r.senderType === "agent" ? (r.user?.name ?? "Agent") : ticket.senderName;
      return `${sender}: ${r.body}`;
    })
    .join("\n\n");

  const agentName = req.user.name;
  const customerName = ticket.senderName.split(" ")[0];

  const { text } = await generateText({
    model: aiModel,
    system:
      "You are a helpful customer support assistant for Code with Mosh. " +
      "Based on the knowledge base, ticket details, and reply history, suggest a professional draft reply to the customer.\n\n" +
      "Knowledge Base:\n" +
      knowledgeBase +
      "\n\n" +
      "Guidelines:\n" +
      `- Address the customer by their name: ${customerName}.\n` +
      "- Maintain a professional, warm, and helpful tone.\n" +
      "- Address the customer's concerns directly using ONLY facts from the knowledge base.\n" +
      "- If the knowledge base does not contain enough information, draft a response explaining that you are looking into the issue and will get back to them.\n" +
      `- Sign off with the agent's name: ${agentName}.\n` +
      "- Do not include any JSON wrapper, markdown backticks, or system preamble. Return ONLY the reply text itself.",
    prompt:
      `Subject: ${ticket.subject}\n\n` +
      `Ticket Description: ${ticket.body}\n\n` +
      (conversation ? `Previous Messages:\n${conversation}` : "No replies yet."),
  });

  res.json({ body: text });
});

router.post("/polish", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(polishReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const agentName = req.user.name;
  const customerName = ticket.senderName.split(" ")[0];

  const { text } = await generateText({
    model: aiModel,
    system:
      "You are a helpful writing assistant for a customer support team. " +
      "Improve the given reply for clarity, professional tone, and grammar. " +
      "Preserve the original meaning and keep the response concise. " +
      "Return only the improved text with no preamble or explanation. " +
      `Address the customer by their name: ${customerName}. ` +
      `End the reply with a sign-off using the agent's name: ${agentName}, and include the link https://codewithmosh.com on its own line after the sign-off.`,
    prompt: data.body,
  });

  res.json({ body: text });
});

export default router;
