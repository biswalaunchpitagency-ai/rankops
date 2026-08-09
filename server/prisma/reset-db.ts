import path from "path";
import dotenv from "dotenv";
dotenv.config({
  path: path.resolve(import.meta.dirname, process.env.NODE_ENV === "test" ? "../.env.test" : "../.env"),
  override: true
});

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, WorkspaceRole, TaskPriority, TicketStatus, TicketCategory, SenderType } from "../src/generated/prisma/client";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database reset...");

  // 1. Delete all existing data in correct dependency order
  console.log("Cleaning database tables...");
  await prisma.timeLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.team.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.reply.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.knowledgeBase.deleteMany();
  await prisma.sOPStep.deleteMany();
  await prisma.sOP.deleteMany();
  await prisma.client.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.verification.deleteMany();

  console.log("Database successfully cleaned.");

  const now = new Date();

  // 2. Seed Admin User (Passwordless for Google SSO)
  const email = process.env.SEED_ADMIN_EMAIL || "yadnyeshsunilborole@gmail.com";
  const adminId = crypto.randomUUID();

  console.log(`Seeding Admin User for Google SSO: ${email}...`);
  await prisma.user.create({
    data: {
      id: adminId,
      name: "Admin",
      email,
      emailVerified: true,
      role: Role.admin,
      onboardedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  // 3. Seed AI Agent User
  console.log("Seeding AI Agent User...");
  await prisma.user.create({
    data: {
      id: AI_AGENT_ID,
      name: "AI Support Agent",
      email: "ai@helpdesk.local",
      emailVerified: true,
      role: Role.agent,
      onboardedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  // 4. Seed normal Agent User (Passwordless for Google SSO)
  const agentId = crypto.randomUUID();
  const agentEmail = "agent@example.com";
  console.log(`Seeding Agent User for Google SSO: ${agentEmail}...`);
  await prisma.user.create({
    data: {
      id: agentId,
      name: "Sarah Agent",
      email: agentEmail,
      emailVerified: true,
      role: Role.agent,
      onboardedAt: null, // Pending invite status
      createdAt: now,
      updatedAt: now,
    },
  });

  // 5. Seed Workspace
  const workspaceId = crypto.randomUUID();
  console.log("Seeding Workspace...");
  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: "Acme Support",
      slug: "acme-support",
      ownerId: adminId,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Add members to workspace
  await prisma.workspaceMember.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        workspaceId,
        userId: adminId,
        role: WorkspaceRole.owner,
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        workspaceId,
        userId: agentId,
        role: WorkspaceRole.member,
        createdAt: now,
      },
    ],
  });

  // 5b. Seed Clients
  console.log("Seeding Clients...");
  const client1Id = crypto.randomUUID();
  const client2Id = crypto.randomUUID();
  const client3Id = crypto.randomUUID();

  await prisma.client.createMany({
    data: [
      {
        id: client1Id,
        name: "Acme Corp",
        type: "SaaS",
        retainerHours: 40,
        status: "Active",
        emailDomains: ["acme.com", "acmecorp.com"],
        notes: "Key SaaS client focused on product search traffic growth.",
        workspaceId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: client2Id,
        name: "Globex Retail",
        type: "E-commerce",
        retainerHours: 25,
        status: "Active",
        emailDomains: ["globex.com", "globexretail.io"],
        notes: "Large e-commerce store optimizing product pages and checkout flow.",
        workspaceId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: client3Id,
        name: "Initech Consulting",
        type: "SaaS",
        retainerHours: 10,
        status: "Paused",
        emailDomains: ["initech.com"],
        notes: "Paused client waiting on contract renewal.",
        workspaceId,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  // 5c. Seed Tools & Resources
  console.log("Seeding Tools & Resources...");
  await prisma.tool.createMany({
    data: [
      { name: "Google Search Console", url: "https://search.google.com", purpose: "Rankings & Indexing", owner: "All", workspaceId },
      { name: "GA4", url: "https://analytics.google.com", purpose: "Traffic Analytics", owner: "All", workspaceId },
      { name: "Ahrefs", url: "https://ahrefs.com", purpose: "Keyword & competitor research", owner: "Strategists", workspaceId },
    ],
  });

  await prisma.resource.createMany({
    data: [
      { name: "Agency report template", url: "#", note: "Duplicate per client, connect GA4", workspaceId },
      { name: "Content brief template", url: "#", note: "Google Doc template", workspaceId },
    ],
  });

  // 6. Seed Team
  const teamId = crypto.randomUUID();
  console.log("Seeding Team...");
  await prisma.team.create({
    data: {
      id: teamId,
      name: "Level 2 Support",
      workspaceId,
      createdAt: now,
      updatedAt: now,
      members: {
        connect: [{ id: adminId }, { id: agentId }],
      },
    },
  });

  // 7. Seed Board
  const boardId = crypto.randomUUID();
  console.log("Seeding Board...");
  await prisma.board.create({
    data: {
      id: boardId,
      name: "Engineering Tasks",
      workspaceId,
      createdAt: now,
      updatedAt: now,
    },
  });

  // 8. Seed Board Columns
  console.log("Seeding Board Columns...");
  const colIds = {
    backlog: crypto.randomUUID(),
    inProgress: crypto.randomUUID(),
    done: crypto.randomUUID(),
  };

  await prisma.boardColumn.createMany({
    data: [
      {
        id: colIds.backlog,
        name: "Backlog",
        position: 0,
        boardId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: colIds.inProgress,
        name: "In Progress",
        position: 1,
        boardId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: colIds.done,
        name: "Done",
        position: 2,
        boardId,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  // 9. Seed Tickets
  console.log("Seeding Tickets...");
  const seededTickets = [];

  const ticketData = [
    {
      subject: "App crashes when uploading large files",
      body: "Whenever I try to upload a file larger than 50 MB, the app crashes with an out-of-memory error. Please assist.",
      status: TicketStatus.open,
      category: TicketCategory.technical_question,
      senderName: "Alice Johnson",
      senderEmail: "alice.johnson@acme.com",
      clientId: client1Id,
    },
    {
      subject: "Two-factor authentication not sending SMS",
      body: "I enabled 2FA but I never receive the SMS verification code. I've tried multiple times.",
      status: TicketStatus.new,
      category: TicketCategory.technical_question,
      senderName: "Marcus Chen",
      senderEmail: "marcus.chen@techcorp.io",
      clientId: null,
    },
    {
      subject: "Charged twice for February subscription",
      body: "I was charged $49.99 twice on February 1st. Please refund the duplicate charge.",
      status: TicketStatus.processing,
      category: TicketCategory.refund_request,
      senderName: "Jennifer Lee",
      senderEmail: "jennifer.lee@globex.com",
      assignedToId: agentId,
      clientId: client2Id,
    },
    {
      subject: "How do I export my data to CSV?",
      body: "I need to export all my project data to CSV for a quarterly report. Where is this option in settings?",
      status: TicketStatus.resolved,
      category: TicketCategory.general_question,
      senderName: "Rachel Green",
      senderEmail: "rachel.green@marketing.co",
      clientId: null,
    },
    {
      subject: "Request for SOC 2 compliance report",
      body: "Our legal team requires your SOC 2 Type II report before we can proceed with signing the enterprise contract.",
      status: TicketStatus.closed,
      category: null,
      senderName: "Catherine Davis",
      senderEmail: "cdavis@enterprise-corp.com",
      clientId: null,
    },
    {
      subject: "API rate limit exceeded unexpectedly",
      body: "We're hitting 429 errors even though our usage is well below the documented limits.",
      status: TicketStatus.open,
      category: TicketCategory.technical_question,
      senderName: "Priya Patel",
      senderEmail: "priya@acme.com",
      clientId: client1Id,
    },
  ];

  for (const t of ticketData) {
    const ticket = await prisma.ticket.create({
      data: {
        subject: t.subject,
        body: t.body,
        status: t.status,
        category: t.category,
        senderName: t.senderName,
        senderEmail: t.senderEmail,
        ...(t.clientId ? { client: { connect: { id: t.clientId } } } : {}),
        ...(t.assignedToId ? { assignedTo: { connect: { id: t.assignedToId } } } : {}),
        workspace: { connect: { id: workspaceId } },
        createdAt: new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000), // Random date within last 5 days
        updatedAt: now,
      },
    });
    seededTickets.push(ticket);
  }

  // 10. Seed Tasks (escalated from tickets)
  console.log("Seeding Tasks & Escalations...");
  
  // Task 1: Linked to Alice's crash ticket (Ticket 0)
  const task1Id = crypto.randomUUID();
  await prisma.task.create({
    data: {
      id: task1Id,
      taskKey: "ACME-1",
      title: "Investigate OOM file upload crash",
      description: `Escalated from ticket: ${seededTickets[0]!.subject}\n\nCustomer reported: ${seededTickets[0]!.body}`,
      priority: TaskPriority.high,
      position: 0,
      workspaceId,
      teamId,
      boardId,
      boardColumnId: colIds.backlog,
      creatorId: adminId,
      assigneeId: agentId,
      linkedTicketId: seededTickets[0]!.id,
      clientId: client1Id,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Task 2: Standalone task on the board
  const task2Id = crypto.randomUUID();
  await prisma.task.create({
    data: {
      id: task2Id,
      taskKey: "ACME-2",
      title: "Fix Stripe webhook signature mismatch",
      description: "Document settings for custom domain authentication.",
      priority: TaskPriority.medium,
      position: 0,
      workspaceId,
      boardId,
      boardColumnId: colIds.inProgress,
      creatorId: adminId,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Task 3: Completed escalated task (Ticket 3)
  const task3Id = crypto.randomUUID();
  await prisma.task.create({
    data: {
      id: task3Id,
      taskKey: "ACME-3",
      title: "Implement CSV Export feature",
      description: "Add CSV export to customer settings.",
      priority: TaskPriority.low,
      position: 0,
      workspaceId,
      teamId,
      boardId,
      boardColumnId: colIds.done,
      creatorId: adminId,
      assigneeId: adminId,
      linkedTicketId: seededTickets[3]!.id,
      clientId: client2Id,
      createdAt: now,
      updatedAt: now,
    },
  });

  // 11. Seed Replies
  console.log("Seeding replies...");
  
  // Add some replies to Jennifer's duplicate charge ticket (Ticket 2)
  await prisma.reply.createMany({
    data: [
      {
        body: "Hello Jennifer, let me check our stripe invoices to confirm the duplicate transaction. I will process a refund immediately if confirmed.",
        senderType: SenderType.agent,
        ticketId: seededTickets[2]!.id,
        userId: agentId,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        body: "Yes please. It shows up twice on my credit card statement from Chase.",
        senderType: SenderType.customer,
        ticketId: seededTickets[2]!.id,
        userId: null,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 mins ago
      },
    ],
  });

  // Add draft AI summary/reply on ticket 0
  await prisma.reply.create({
    data: {
      body: "Based on the error logs, this issue is caused by memory leaks in the multer upload handler. I recommend setting up stream uploading directly to file storage.",
      senderType: SenderType.agent,
      ticketId: seededTickets[0]!.id,
      userId: AI_AGENT_ID,
      isDraft: true,
      createdAt: now,
    },
  });

  // 11b. Seed Time Logs
  console.log("Seeding Time Logs...");
  await prisma.timeLog.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        hours: 2.5,
        note: "Debugging upload streams and testing memory footprint.",
        userId: agentId,
        taskId: task1Id,
        ticketId: seededTickets[0]!.id,
        workspaceId,
        date: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        hours: 1.0,
        note: "Reviewed stripe invoice discrepancy.",
        userId: agentId,
        ticketId: seededTickets[2]!.id,
        workspaceId,
        date: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        hours: 4.0,
        note: "Writing SAML configuration docs.",
        userId: adminId,
        taskId: task2Id,
        workspaceId,
        date: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        createdAt: now,
      },
    ],
  });

  // 12. Seed default SOPs and KB articles for the workspace
  console.log("Seeding default SOPs and Knowledge Base articles...");
  const { seedWorkspaceDefaults } = await import("../src/lib/workspace-defaults");
  await seedWorkspaceDefaults(workspaceId);

  console.log("Database reset and seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during database reset/seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
