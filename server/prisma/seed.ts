import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env"
    );
  }

  const now = new Date();

  // Seed admin user
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`Admin user ${email} already exists — skipping.`);
  } else {
    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name: "Admin",
          email,
          emailVerified: false,
          role: Role.admin,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      }),
    ]);
    console.log(`Admin user ${email} created successfully.`);
  }

  // Seed AI agent user
  const existingAI = await prisma.user.findUnique({
    where: { id: AI_AGENT_ID },
  });
  if (existingAI) {
    console.log("AI agent user already exists — skipping.");
  } else {
    await prisma.user.create({
      data: {
        id: AI_AGENT_ID,
        name: "AI",
        email: "ai@helpdesk.local",
        emailVerified: false,
        role: Role.agent,
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log("AI agent user created successfully.");
  }

  // Seed tools and resources for existing workspaces
  const workspace = await prisma.workspace.findFirst();
  if (workspace) {
    const existingTools = await prisma.tool.findFirst({ where: { workspaceId: workspace.id } });
    if (!existingTools) {
      await prisma.tool.createMany({
        data: [
          { name: "Google Search Console", url: "https://search.google.com", purpose: "Rankings & Indexing", owner: "All", workspaceId: workspace.id },
          { name: "GA4", url: "https://analytics.google.com", purpose: "Traffic Analytics", owner: "All", workspaceId: workspace.id },
          { name: "Ahrefs", url: "https://ahrefs.com", purpose: "Keyword & competitor research", owner: "Strategists", workspaceId: workspace.id }
        ]
      });
      console.log("Seeded tools for workspace:", workspace.name);
    }

    const existingResources = await prisma.resource.findFirst({ where: { workspaceId: workspace.id } });
    if (!existingResources) {
      await prisma.resource.createMany({
        data: [
          { name: "Agency report template", url: "#", note: "Duplicate per client, connect GA4", workspaceId: workspace.id },
          { name: "Content brief template", url: "#", note: "Google Doc template", workspaceId: workspace.id }
        ]
      });
      console.log("Seeded resources for workspace:", workspace.name);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
