import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: process.env.NODE_ENV === "test" ? path.resolve(process.cwd(), ".env.test") : undefined,
  override: true
});
import Sentry from "./lib/sentry";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";
import { requireWorkspaceMember } from "./middleware/require-workspace-member";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import agentsRouter from "./routes/agents";
import webhooksRouter from "./routes/webhooks";
import repliesRouter from "./routes/replies";
import workspacesRouter from "./routes/workspaces";
import boardsRouter from "./routes/boards";
import tasksRouter from "./routes/tasks";
import teamsRouter from "./routes/teams";
import clientsRouter from "./routes/clients";
import sopsRouter from "./routes/sops";
import timeLogsRouter from "./routes/timelogs";
import kbRouter from "./routes/kb";
import toolsRouter from "./routes/tools";
import resourcesRouter from "./routes/resources";
import { startQueue, stopQueue } from "./lib/queue";
import { startGmailPolling, stopGmailPolling } from "./lib/poll-gmail";


if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.TRUSTED_ORIGINS?.split(",") ?? [],
    credentials: true,
  })
);

const isProduction = process.env.NODE_ENV === "production";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  skip: () => !isProduction,
});

// Mount Better Auth handler BEFORE express.json()
// Better Auth parses its own request bodies
// toNodeHandler returns a promise; must be caught for Express 5
app.all("/api/auth/{*any}", authLimiter, (req, res, next) => {
  toNodeHandler(auth)(req, res).catch(next);
});

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

app.use("/api/users", usersRouter);
// Workspace-scoped routes (for workspace context)
app.use("/api/workspaces/:workspaceId/tickets", requireAuth, requireWorkspaceMember, ticketsRouter);
app.use("/api/workspaces/:workspaceId/tickets/:ticketId/replies", requireAuth, requireWorkspaceMember, repliesRouter);
// Legacy flat routes (for existing frontend pages that don't have workspace context in URL)
app.use("/api/tickets", requireAuth, ticketsRouter);
app.use("/api/tickets/:ticketId/replies", requireAuth, repliesRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/workspaces", workspacesRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/workspaces/:workspaceId/teams", requireAuth, requireWorkspaceMember, teamsRouter);
app.use("/api/workspaces/:workspaceId/clients", requireAuth, requireWorkspaceMember, clientsRouter);
app.use("/api/workspaces/:workspaceId/sops", requireAuth, requireWorkspaceMember, sopsRouter);
app.use("/api/workspaces/:workspaceId/timelogs", requireAuth, requireWorkspaceMember, timeLogsRouter);
app.use("/api/workspaces/:workspaceId/kb", requireAuth, requireWorkspaceMember, kbRouter);
app.use("/api/workspaces/:workspaceId/tools", requireAuth, requireWorkspaceMember, toolsRouter);
app.use("/api/workspaces/:workspaceId/resources", requireAuth, requireWorkspaceMember, resourcesRouter);

Sentry.setupExpressErrorHandler(app);

// In production, the client is hosted separately on Vercel, so we do not serve static files from the backend.

if (!process.env.WEBHOOK_SECRET) {
  console.warn("Warning: WEBHOOK_SECRET is not set. Webhook endpoints will return 500.");
}

async function boot() {
  await startQueue();
  const pollInterval = Number(process.env.GMAIL_POLLING_INTERVAL || 60000);
  startGmailPolling(pollInterval);

  const server = app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    stopGmailPolling();
    await stopQueue();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

boot().catch((error) => {
  Sentry.captureException(error);
  console.error("Failed to start server:", error);
  process.exit(1);
});
