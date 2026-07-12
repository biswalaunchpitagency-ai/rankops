import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env"), override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, WorkspaceRole, TaskPriority, TicketStatus, TicketCategory, SenderType } from "../src/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database reset...");

  // 1. Delete all existing data in correct dependency order
  console.log("Cleaning database tables...");
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.team.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.reply.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.verification.deleteMany();

  console.log("Database successfully cleaned.");

  const now = new Date();

  // 2. Seed Admin User
  const email = process.env.SEED_ADMIN_EMAIL || "yadnyeshsunilborole@gmail.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "abc";
  const adminId = crypto.randomUUID();
  const hashedAdminPassword = await hashPassword(password);

  console.log(`Seeding Admin User: ${email}...`);
  await prisma.user.create({
    data: {
      id: adminId,
      name: "Admin",
      email,
      emailVerified: true,
      role: Role.admin,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: adminId,
      providerId: "credential",
      userId: adminId,
      password: hashedAdminPassword,
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
      createdAt: now,
      updatedAt: now,
    },
  });

  // 4. Seed normal Agent User
  const agentId = crypto.randomUUID();
  const agentEmail = "agent@example.com";
  const hashedAgentPassword = await hashPassword("password123");
  console.log(`Seeding Agent User: ${agentEmail}...`);
  await prisma.user.create({
    data: {
      id: agentId,
      name: "Sarah Agent",
      email: agentEmail,
      emailVerified: true,
      role: Role.agent,
      createdAt: now,
      updatedAt: now,
    },
  });
  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: agentId,
      providerId: "credential",
      userId: agentId,
      password: hashedAgentPassword,
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
      name: "Engineering Escalations",
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
      senderEmail: "alice.johnson@example.com",
    },
    {
      subject: "Two-factor authentication not sending SMS",
      body: "I enabled 2FA but I never receive the SMS verification code. I've tried multiple times.",
      status: TicketStatus.new,
      category: TicketCategory.technical_question,
      senderName: "Marcus Chen",
      senderEmail: "marcus.chen@techcorp.io",
    },
    {
      subject: "Charged twice for February subscription",
      body: "I was charged $49.99 twice on February 1st. Please refund the duplicate charge.",
      status: TicketStatus.processing,
      category: TicketCategory.refund_request,
      senderName: "Jennifer Lee",
      senderEmail: "jennifer.lee@inbox.com",
      assignedToId: agentId,
    },
    {
      subject: "How do I export my data to CSV?",
      body: "I need to export all my project data to CSV for a quarterly report. Where is this option in settings?",
      status: TicketStatus.resolved,
      category: TicketCategory.general_question,
      senderName: "Rachel Green",
      senderEmail: "rachel.green@marketing.co",
    },
    {
      subject: "Request for SOC 2 compliance report",
      body: "Our legal team requires your SOC 2 Type II report before we can proceed with signing the enterprise contract.",
      status: TicketStatus.closed,
      category: null,
      senderName: "Catherine Davis",
      senderEmail: "cdavis@enterprise-corp.com",
    },
    {
      subject: "API rate limit exceeded unexpectedly",
      body: "We're hitting 429 errors even though our usage is well below the documented limits.",
      status: TicketStatus.open,
      category: TicketCategory.technical_question,
      senderName: "Priya Patel",
      senderEmail: "priya@devstudio.com",
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
  await prisma.task.create({
    data: {
      id: crypto.randomUUID(),
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
      createdAt: now,
      updatedAt: now,
    },
  });

  // Task 2: Standalone task on the board
  await prisma.task.create({
    data: {
      id: crypto.randomUUID(),
      taskKey: "ACME-2",
      title: "Write documentation for SAML SSO",
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
  await prisma.task.create({
    data: {
      id: crypto.randomUUID(),
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
      }
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

  // 12. Seed default SOPs for the workspace
  console.log("Seeding default SOPs...");
  const defaultSops = [
    { title: "On-Page Optimization", category: "Delivery", tools: "Surfer, GSC, Screaming Frog",
      steps: ["Validate target keyword & search intent", "Keyword in title, meta, H1, first 100 words", "Title tag ≤ 60 characters", "Meta description ≤ 160 characters", "Heading structure H1–H6 correct", "Image alt texts optimized", "3–5 internal links added", "Schema markup added/validated", "Page speed & mobile check", "Request indexing in GSC"] },
    { title: "Technical SEO Audit", category: "Delivery", tools: "Screaming Frog, GSC, Ahrefs",
      steps: ["Full crawl (Screaming Frog)", "Index coverage & canonical review", "Core Web Vitals check", "Robots.txt & XML sitemap validation", "Broken links / redirect chains", "Schema validation", "Mobile usability check", "Prioritized fix list delivered"] },
    { title: "Monthly Reporting", category: "Process", tools: "GSC, GA4, Looker Studio",
      steps: ["Data pull on 1st working day", "Rankings + traffic + conversions vs last month", "Completed work summary", "Wins, losses, and why", "Next month plan (3–5 priorities)", "PM review before sending", "Send by the 5th"] },
    { title: "Client Onboarding", category: "Process", tools: "GSC, GA4, Ahrefs",
      steps: ["Send access checklist (GSC, GA4, CMS)", "Kickoff call: goals, KPIs, history", "Document SOW, retainer hours, report dates", "Baseline audit + keyword landscape", "Share 90-day roadmap within 10 business days"] },
    { title: "Content Production", category: "Delivery", tools: "Ahrefs, Surfer, Google Docs",
      steps: ["Brief from keyword cluster", "Strategist approves brief before writing", "Writer drafts in template doc", "SEO QA against on-page checklist", "Publish + index request"] },
    { title: "Link Building Outreach", category: "Delivery", tools: "Ahrefs, Hunter, Pitchbox",
      steps: ["Prospect: relevance first, DR 30+ preferred", "Verify traffic is real", "Personalize first line of every email", "Max 2 follow-ups, 3–4 days apart", "Log every acquired link: URL, DR, anchor"] },
  ];

  for (const sop of defaultSops) {
    await prisma.sOP.create({
      data: {
        id: crypto.randomUUID(),
        title: sop.title,
        category: sop.category,
        tools: sop.tools,
        workspaceId,
        steps: {
          create: sop.steps.map((text, position) => ({ id: crypto.randomUUID(), text, position })),
        },
      },
    });
  }

  // 13. Seed default KB articles
  console.log("Seeding default Knowledge Base articles...");
  const defaultKb = [
    { title: "Traffic drop triage playbook", category: "Technical", keywords: "traffic,drop,rankings,decline,lost", content: "We are sorry to see the drop — here is what we do first: 1) check Search Console coverage and manual actions, 2) compare before/after crawls to catch noindex or redirect issues, 3) review recent Google updates. We run this triage within one business day and send findings." },
    { title: "404 / crawl error handling", category: "Technical", keywords: "404,error,crawl,search console,index,broken,redirect", content: "404 spikes usually come from changed URLs without redirects. We map the broken URLs, add 301 redirects to the closest match, and request a re-crawl. Most errors clear from the report within 1–2 weeks after fixing." },
    { title: "Billing & refund policy", category: "Billing", keywords: "refund,invoice,charged,billing,credit,payment,extra hours", content: "Our policy: hours beyond the retainer are only billed with prior written approval. If extra hours were billed without approval, we credit them on the next invoice or refund on request within 5 business days." },
    { title: "Reporting schedule", category: "Process", keywords: "report,monthly report,dashboard,numbers,metrics", content: "Monthly reports are delivered by the 5th working day and cover rankings, traffic, conversions, completed work and next month priorities." },
    { title: "Site speed / Core Web Vitals", category: "Technical", keywords: "speed,slow,core web vitals,theme,performance,vitals", content: "Theme or plugin changes are the most common cause of CWV regressions. We profile the templates, defer non-critical scripts, compress media and re-test. Expect a fix plan within 2 business days." },
    { title: "Services & pricing overview", category: "Sales", keywords: "services,pricing,offer,local seo,retainer,cost,quote", content: "Yes — we cover technical SEO, content, link building and local SEO. Retainers start at 20 hours/month; we will send a tailored proposal after a short discovery call." },
  ];

  for (const article of defaultKb) {
    await prisma.knowledgeBase.create({
      data: {
        id: crypto.randomUUID(),
        title: article.title,
        category: article.category,
        keywords: article.keywords,
        content: article.content,
        workspaceId,
      },
    });
  }

  console.log("Database reset and seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during database reset/seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
