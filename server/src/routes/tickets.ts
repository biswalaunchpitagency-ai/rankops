import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { parseId } from "../lib/parse-id";
import { ticketListQuerySchema, updateTicketSchema } from "core/schemas/tickets.ts";
import prisma from "../db";
import { Prisma } from "../generated/prisma/client";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";
import { syncState, pollGmailOnce } from "../lib/poll-gmail";

interface TicketStatsRow {
  totalTickets: bigint;
  openTickets: bigint;
  resolvedByAI: bigint;
  aiResolutionRate: number;
  avgResolutionTime: number;
}

const router = Router({ mergeParams: true });

const SAMPLE_EMAILS = [
  {name:'Rachel Kim', from:'rachel@acmestore.com', subject:'Blog pages showing 404 in Search Console', body:'Hi, Search Console is reporting a spike in 404 errors on our blog section since Tuesday. Please investigate.'},
  {name:'Omar Haddad', from:'omar@bluerocksaas.com', subject:'Can we get a refund for the extra hours billed?', body:'Hello, our June invoice shows 6 extra hours beyond the retainer that we did not approve. Can you review?'},
  {name:'Jess Malone', from:'jess@urbannest.com', subject:'Question about next month content plan', body:'Hi team! What topics are planned for next month? Also, when is our monthly report coming?'},
  {name:'Leo Grant', from:'leo@fitfuel.com', subject:'Site speed feels slow after new theme', body:'Hey, we installed a new theme and pages feel slower. Can your technical team take a look?'}
];

router.post("/simulate-email", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;
  
  // Pick next email
  const index = Math.floor(Math.random() * SAMPLE_EMAILS.length);
  const emailSample = (SAMPLE_EMAILS[index] || SAMPLE_EMAILS[0]) as { name: string; from: string; subject: string; body: string };

  // Map simulated email to a client in this workspace by domain
  const domain = emailSample.from.split("@")[1] || "";
  const client = await prisma.client.findFirst({
    where: { workspaceId, name: { contains: domain.split(".")[0] || "", mode: "insensitive" } }
  });

  // Assign category based on keywords
  const category = emailSample.subject.includes("refund") || emailSample.body.includes("refund")
    ? "refund_request"
    : emailSample.subject.includes("speed") || emailSample.body.includes("404")
    ? "technical_question"
    : "general_question";

  // Create ticket
  const ticket = await prisma.ticket.create({
    data: {
      subject: emailSample.subject,
      senderName: emailSample.name,
      senderEmail: emailSample.from,
      status: "new", // hidden from standard board, visible in inbox
      category: category as any,
      workspaceId,
      clientId: client?.id || null,
      body: emailSample.body
    }
  });

  res.json({ ok: true, ticket });
});

router.get("/stats", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId ?? null;

  const [row] = workspaceId
    ? await prisma.$queryRaw<[TicketStatsRow]>`
        WITH counts AS (
          SELECT
            COUNT(*) FILTER (WHERE status IN ('open', 'resolved', 'closed'))  AS total_tickets,
            COUNT(*) FILTER (WHERE status = 'open')                           AS open_tickets,
            COUNT(*) FILTER (WHERE status = 'resolved' AND "assignedToId" = ${AI_AGENT_ID}) AS resolved_by_ai,
            COUNT(*) FILTER (WHERE status = 'resolved')                       AS total_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) FILTER (WHERE status = 'resolved') AS avg_resolution
          FROM ticket
          WHERE "workspaceId" = ${workspaceId}
        )
        SELECT
          total_tickets       AS "totalTickets",
          open_tickets        AS "openTickets",
          resolved_by_ai      AS "resolvedByAI",
          CASE
            WHEN total_resolved > 0
            THEN ROUND((resolved_by_ai::DOUBLE PRECISION / total_resolved * 100)::NUMERIC, 1)::DOUBLE PRECISION
            ELSE 0
          END                 AS "aiResolutionRate",
          COALESCE(ROUND(avg_resolution::NUMERIC), 0)::DOUBLE PRECISION AS "avgResolutionTime"
        FROM counts
      `
    : await prisma.$queryRaw<[TicketStatsRow]>`
        WITH counts AS (
          SELECT
            COUNT(*) FILTER (WHERE status IN ('open', 'resolved', 'closed'))  AS total_tickets,
            COUNT(*) FILTER (WHERE status = 'open')                           AS open_tickets,
            COUNT(*) FILTER (WHERE status = 'resolved' AND "assignedToId" = ${AI_AGENT_ID}) AS resolved_by_ai,
            COUNT(*) FILTER (WHERE status = 'resolved')                       AS total_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) FILTER (WHERE status = 'resolved') AS avg_resolution
          FROM ticket
        )
        SELECT
          total_tickets       AS "totalTickets",
          open_tickets        AS "openTickets",
          resolved_by_ai      AS "resolvedByAI",
          CASE
            WHEN total_resolved > 0
            THEN ROUND((resolved_by_ai::DOUBLE PRECISION / total_resolved * 100)::NUMERIC, 1)::DOUBLE PRECISION
            ELSE 0
          END                 AS "aiResolutionRate",
          COALESCE(ROUND(avg_resolution::NUMERIC), 0)::DOUBLE PRECISION AS "avgResolutionTime"
        FROM counts
      `;

  const recentTickets = await prisma.ticket.findMany({
    where: {
      ...(workspaceId ? { workspaceId } : {}),
      status: { in: ["open", "resolved", "closed"] },
    },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      senderName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const categoryBreakdown = await prisma.ticket.groupBy({
    by: ["category"],
    where: {
      ...(workspaceId ? { workspaceId } : {}),
      status: { in: ["open", "resolved", "closed"] },
      category: { not: null },
    },
    _count: { id: true },
  });

  const categories = categoryBreakdown.map((c) => ({
    category: c.category,
    count: c._count.id,
  }));

  res.json({
    totalTickets: Number(row.totalTickets),
    openTickets: Number(row.openTickets),
    resolvedByAI: Number(row.resolvedByAI),
    aiResolutionRate: row.aiResolutionRate,
    avgResolutionTime: row.avgResolutionTime,
    recentTickets,
    categories,
  });
});

router.get("/stats/daily-volume", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId ?? null;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(workspaceId ? { workspaceId } : {}),
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true },
  });

  // Build a map of date -> count
  const countsByDate = new Map<string, number>();
  for (const t of tickets) {
    const dateKey = t.createdAt.toISOString().slice(0, 10);
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  // Fill in all 30 days (including zeros)
  const data: { date: string; tickets: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const dateKey = d.toISOString().slice(0, 10);
    data.push({ date: dateKey, tickets: countsByDate.get(dateKey) ?? 0 });
  }

  res.json({ data });
});

router.get("/", requireAuth, async (req, res) => {
  const query = validate(ticketListQuerySchema, req.query, res);
  if (!query) return;

  const where: Prisma.TicketWhereInput = req.workspaceId ? { workspaceId: req.workspaceId } : {};

  if (query.status) {
    where.status = query.status;
  } else {
    where.status = { in: ["open", "resolved", "closed"] };
  }

  if (query.category) {
    where.category = query.category;
  }

  if (query.search) {
    where.OR = [
      { subject: { contains: query.search, mode: "insensitive" } },
      { senderName: { contains: query.search, mode: "insensitive" } },
      { senderEmail: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      select: {
        id: true,
        subject: true,
        status: true,
        category: true,
        senderName: true,
        senderEmail: true,
        createdAt: true,
      },
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page: query.page, pageSize: query.pageSize });
});

router.get("/sync-status", requireAuth, async (req, res) => {
  res.json(syncState);
});

router.post("/sync", requireAuth, async (req, res) => {
  if (syncState.isSyncing) {
    res.status(202).json({ message: "Sync already in progress", syncState });
    return;
  }

  // Trigger sync in the background asynchronously
  pollGmailOnce().catch((err) => {
    console.error("[Sync Endpoint] Background sync execution failed:", err);
  });

  res.status(202).json({ message: "Sync initiated", syncState });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: {
      id,
      ...(req.workspaceId ? { workspaceId: req.workspaceId } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(updateTicketSchema, req.body, res);
  if (!data) return;

  if (data.assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: data.assignedToId, deletedAt: null },
    });
    if (!user) {
      res.status(400).json({ error: "Invalid agent" });
      return;
    }
  }

  const ticket = await prisma.ticket.findUnique({
    where: {
      id,
      ...(req.workspaceId ? { workspaceId: req.workspaceId } : {}),
    },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...("assignedToId" in data && { assignedToId: data.assignedToId }),
      ...("status" in data && { status: data.status }),
      ...("category" in data && { category: data.category }),
      ...("impact" in data && { impact: data.impact }),
      ...("checklist" in data && { checklist: data.checklist }),
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json(updated);
});

export default router;
