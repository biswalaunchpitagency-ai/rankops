# Gmail Sync and Idempotency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a robust, real-time sync experience for the Helpdesk support agents that guarantees zero duplicate ticket creation and minimizes server resources on the Railway Hobby tier.

**Architecture:** We will use a database-level unique constraint (`gmailMessageId`) to guarantee that the same email cannot be imported twice. In-memory locking on the server will prevent concurrent sync loops, while React Query polling on the frontend will track sync progress and update the UI reactively.

**Tech Stack:** React, TailwindCSS/CSS, TanStack React Query, Axios, Lucide Icons, Express, Node/Bun, Prisma, PostgreSQL.

## Global Constraints
- Do not use placeholders or placeholders comments like `// TODO: implement later`. Write full implementations.
- Always use `try...finally` on locks to prevent deadlock situations if the Gmail API throws errors.
- Always typecheck code with `bunx tsc --noEmit` on the server before committing.

---

### Task 1: Prisma Schema Update and DB Synchronization

**Files:**
- Modify: `server/prisma/schema.prisma:112-152`

**Interfaces:**
- Produces: Updated database tables `ticket` and `reply` with unique column `gmailMessageId`.

- [ ] **Step 1: Add `gmailMessageId` field to `Ticket` and `Reply` models**
  Modify `server/prisma/schema.prisma` lines 112-152 to add the unique fields:
  ```prisma
  model Ticket {
    id             Int             @id @default(autoincrement())
    subject        String
    body           String
    bodyHtml       String?
    status         TicketStatus    @default(new)
    category       TicketCategory?
    senderName     String
    senderEmail    String
    assignedToId   String?
    assignedTo     User?           @relation(fields: [assignedToId], references: [id])
    workspaceId    String
    workspace      Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
    clientId       String?
    client         Client?         @relation(fields: [clientId], references: [id], onDelete: SetNull)
    phase          String?
    impact         String?
    checklist      Json?
    gmailMessageId String?         @unique
    createdAt      DateTime        @default(now())
    updatedAt      DateTime        @updatedAt
    replies        Reply[]
    linkedTask     Task?
    timeLogs       TimeLog[]

    @@map("ticket")
  }

  model Reply {
    id             Int        @id @default(autoincrement())
    body           String
    bodyHtml       String?
    senderType     SenderType
    ticketId       Int
    ticket         Ticket     @relation(fields: [ticketId], references: [id], onDelete: Cascade)
    userId         String?
    user           User?      @relation(fields: [userId], references: [id])
    gmailMessageId String?    @unique
    createdAt      DateTime   @default(now())
    isDraft        Boolean    @default(false)

    @@map("reply")
  }
  ```

- [ ] **Step 2: Sync Database and Regenerate Prisma Client**
  Run:
  ```powershell
  bun run db:push; bun run db:generate
  ```
  Expected output: Schema synchronized, Client generated successfully.

- [ ] **Step 3: Commit**
  ```bash
  git add server/prisma/schema.prisma
  git commit -m "db: add unique gmailMessageId column to Ticket and Reply models"
  ```

---

### Task 2: Implement Idempotency Checking in Email Processing

**Files:**
- Modify: `server/src/lib/incoming-email.ts`

**Interfaces:**
- Consumes: Updated Prisma client types for `Ticket` and `Reply`.
- Produces: `processIncomingEmail(data: IncomingEmailData)` which checks for existing `gmailMessageId` and skips if found.

- [ ] **Step 1: Update `IncomingEmailData` and implement checks in `processIncomingEmail`**
  Modify `server/src/lib/incoming-email.ts`:
  ```typescript
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
        throw new Error("No workspace found to assign incoming email ticket");
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
  ```

- [ ] **Step 2: Typecheck server**
  Run: `bunx tsc --noEmit` inside `server/`
  Expected: exit code 0

- [ ] **Step 3: Commit**
  ```bash
  git add server/src/lib/incoming-email.ts
  git commit -m "feat: check for duplicate Gmail message IDs in incoming email processor"
  ```

---

### Task 3: Backend In-Memory Sync Lock and pollGmailOnce Updates

**Files:**
- Modify: `server/src/lib/poll-gmail.ts`
- Modify: `server/.env.example`
- Modify: `server/.env`

**Interfaces:**
- Produces: Exported `syncState` and updated `pollGmailOnce()` that locks during fetches, updates progress, and propagates Gmail message IDs to the incoming email processor.

- [ ] **Step 1: Implement `SyncState` tracking and wrap `pollGmailOnce` in a lock**
  Modify `server/src/lib/poll-gmail.ts` to export the state, wrap the poller execution in a try-finally lock, and forward `msg.id`:
  ```typescript
  // Add at top:
  export interface SyncState {
    isSyncing: boolean;
    lastSyncTime: string | null;
    lastSyncStatus: "idle" | "success" | "error";
    lastSyncError?: string;
  }

  export let syncState: SyncState = {
    isSyncing: false,
    lastSyncTime: null,
    lastSyncStatus: "idle",
  };

  // Modify pollGmailOnce() to use lock and set state:
  export async function pollGmailOnce() {
    if (syncState.isSyncing) {
      console.log("[Gmail Poller] A sync is already in progress, skipping.");
      return;
    }

    syncState.isSyncing = true;
    syncState.lastSyncStatus = "idle";

    try {
      const accessToken = await getAccessToken();

      const queryFilter = process.env.GMAIL_QUERY_FILTER || "is:unread label:Support";
      const query = encodeURIComponent(queryFilter);
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`;
      const listResponse = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to list unread Gmail messages: ${listResponse.statusText}`);
      }

      const listData = await listResponse.json() as { messages?: { id: string; threadId: string }[] };
      const messages = listData.messages || [];

      if (messages.length > 0) {
        console.log(`[Gmail Poller] Found ${messages.length} unread message(s) to process.`);

        for (const msg of messages) {
          try {
            const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`;
            const detailResponse = await fetch(detailUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!detailResponse.ok) {
              console.error(`[Gmail Poller] Failed to fetch message ${msg.id}: ${detailResponse.statusText}`);
              continue;
            }

            const msgDetail = await detailResponse.json() as GmailMessageDetail;
            if (!msgDetail.payload) {
              console.warn(`[Gmail Poller] Message ${msg.id} has no payload.`);
              continue;
            }

            const headers = msgDetail.payload.headers || [];
            const fromHeader = getHeader(headers, "from");
            const subjectHeader = getHeader(headers, "subject") || "(No Subject)";
            console.log(`[Gmail Poller] Found message ${msg.id} from ${fromHeader} with subject ${subjectHeader}`);
            if (!fromHeader) {
              console.warn(`[Gmail Poller] Message ${msg.id} has no From header.`);
              continue;
            }

            const { email: fromEmail, name: fromName } = parseFromField(fromHeader);
            const { text: bodyText, html: bodyHtml } = parseMessageBody(msgDetail.payload);

            const result = await processIncomingEmail({
              fromEmail,
              fromName,
              subject: subjectHeader,
              body: bodyText || msgDetail.snippet || "",
              bodyHtml: bodyHtml || undefined,
              gmailMessageId: msg.id, // Passed to ensure idempotency
            });

            console.log(`[Gmail Poller] Successfully processed message ${msg.id} as a new ${result.type}.`);

            const modifyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`;
            const modifyResponse = await fetch(modifyUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                removeLabelIds: ["UNREAD"],
              }),
            });

            if (!modifyResponse.ok) {
              console.error(`[Gmail Poller] Failed to mark message ${msg.id} as read: ${modifyResponse.statusText}`);
            } else {
              console.log(`[Gmail Poller] Marked message ${msg.id} as read.`);
            }
          } catch (msgError) {
            console.error(`[Gmail Poller] Error processing individual message ${msg.id}:`, msgError);
            Sentry.captureException(msgError);
          }
        }
      }

      syncState.lastSyncTime = new Date().toISOString();
      syncState.lastSyncStatus = "success";
      syncState.lastSyncError = undefined;
    } catch (error: any) {
      console.error("[Gmail Poller] Error in polling cycle:", error);
      Sentry.captureException(error);
      syncState.lastSyncStatus = "error";
      syncState.lastSyncError = error.message || String(error);
    } finally {
      syncState.isSyncing = false;
    }
  }
  ```

- [ ] **Step 2: Increase Background Polling Interval to 15 Minutes**
  Modify `server/.env.example` and `server/.env` to default `GMAIL_POLLING_INTERVAL` to 15 minutes (`900000` ms).
  In `server/.env.example`:
  ```ini
  GMAIL_POLLING_INTERVAL="900000" # Background polling interval in milliseconds (defaults to 15 min / 900000)
  ```
  In `server/.env`:
  ```ini
  GMAIL_POLLING_INTERVAL="900000"
  ```

- [ ] **Step 3: Typecheck server**
  Run: `bunx tsc --noEmit` inside `server/`
  Expected: exit code 0

- [ ] **Step 4: Commit**
  ```bash
  git add server/src/lib/poll-gmail.ts server/.env server/.env.example
  git commit -m "feat: implement sync state lock and change default polling interval to 15m"
  ```

---

### Task 4: Add Express API Routes for Sync

**Files:**
- Modify: `server/src/routes/tickets.ts`

**Interfaces:**
- Produces: API routes `POST /sync` and `GET /sync-status`.

- [ ] **Step 1: Register API routes in tickets controller**
  Modify `server/src/routes/tickets.ts` to add routes directly **above** the `router.get("/:id")` handler:
  ```typescript
  import { syncState, pollGmailOnce } from "../lib/poll-gmail";

  // ... (existing routes above Stats) ...

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

  // ... (this MUST be registered BEFORE router.get("/:id")) ...
  router.get("/:id", requireAuth, async (req, res) => { ... })
  ```

- [ ] **Step 2: Typecheck server**
  Run: `bunx tsc --noEmit` inside `server/`
  Expected: exit code 0

- [ ] **Step 3: Commit**
  ```bash
  git add server/src/routes/tickets.ts
  git commit -m "feat: add sync and sync-status Express API routes"
  ```

---

### Task 5: Frontend Integration & Visual Indicators

**Files:**
- Modify: `client/src/pages/SupportInboxPage.tsx`

**Interfaces:**
- Consumes: `/api/tickets/sync` and `/api/tickets/sync-status` API.
- Produces: A responsive UI header showing sync state and a manual sync button.

- [ ] **Step 1: Implement Sync Queries and Mutators in SupportInboxPage**
  Add React Query and useEffect logic at the top of `SupportInboxPage` inside `client/src/pages/SupportInboxPage.tsx` (around lines 9-48):
  ```typescript
  import { useState, useEffect } from "react";
  import { useActiveWorkspace } from "../lib/workspace-context";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import axios from "axios";
  import { Button } from "@/components/ui/button";
  import { Mail, Send, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

  export default function SupportInboxPage() {
    const queryClient = useQueryClient();
    const { activeWorkspaceId } = useActiveWorkspace();
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");

    // 1. Sync Status Query with polling
    const { data: syncState } = useQuery<any>({
      queryKey: ["sync-status"],
      queryFn: async () => {
        const { data } = await axios.get("/api/tickets/sync-status");
        return data;
      },
      refetchInterval: (query) => {
        // Poll every 1.5 seconds if sync is running, else stop polling
        return query.state.data?.isSyncing ? 1500 : false;
      }
    });

    // 2. Trigger Sync Mutation
    const triggerSyncMutation = useMutation({
      mutationFn: async () => {
        const { data } = await axios.post("/api/tickets/sync");
        return data;
      },
      onMutate: () => {
        // Optimistically set syncing state to true
        queryClient.setQueryData(["sync-status"], (old: any) => ({ ...old, isSyncing: true }));
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      }
    });

    // 3. Auto-sync on Mount (2-minute cooldown)
    useEffect(() => {
      if (syncState && !syncState.isSyncing) {
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        const lastSyncTimeMs = syncState.lastSyncTime ? new Date(syncState.lastSyncTime).getTime() : 0;
        if (lastSyncTimeMs < twoMinutesAgo) {
          triggerSyncMutation.mutate();
        }
      }
    }, [syncState?.lastSyncTime]);

    // 4. Invalidate tickets cache when sync finishes successfully
    useEffect(() => {
      if (syncState && !syncState.isSyncing && syncState.lastSyncStatus === "success") {
        queryClient.invalidateQueries({ queryKey: ["tickets", activeWorkspaceId] });
        queryClient.invalidateQueries({ queryKey: ["unread-inbox-count", activeWorkspaceId] });
      }
    }, [syncState?.isSyncing, syncState?.lastSyncStatus, activeWorkspaceId]);
  ```

- [ ] **Step 2: Add Sync Controls & Status Indicators to Header Layout**
  Modify lines 108–118 in `client/src/pages/SupportInboxPage.tsx` to add indicators and the "Sync Inbox" button:
  ```typescript
    // Format last sync time string
    const getLastSyncText = () => {
      if (!syncState?.lastSyncTime) return "";
      const date = new Date(syncState.lastSyncTime);
      return `Synced at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    };

    return (
      <div className="space-y-6 h-full flex flex-col font-sans">
        <div className="flex justify-between items-end shrink-0 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-4xl font-light tracking-tight text-foreground leading-none">Support Inbox</h1>
                
                {/* Sync status indicator */}
                {syncState?.isSyncing && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                    <RefreshCw size={10} className="animate-spin" /> Syncing Gmail...
                  </span>
                )}
                {!syncState?.isSyncing && syncState?.lastSyncStatus === "error" && (
                  <span 
                    title={syncState?.lastSyncError || "Unknown error occurred"}
                    className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-full cursor-help"
                  >
                    <AlertCircle size={10} /> Sync Failed
                  </span>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground mt-2">
                Review incoming support emails and send drafts {syncState?.lastSyncTime && `• ${getLastSyncText()}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Sync Inbox Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerSyncMutation.mutate()}
              disabled={syncState?.isSyncing}
              className="gap-1.5 cursor-pointer rounded-sm border border-border text-xs h-8 bg-card hover:bg-muted/30"
            >
              <RefreshCw size={12} className={syncState?.isSyncing ? "animate-spin" : ""} />
              {syncState?.isSyncing ? "Checking..." : "Sync Inbox"}
            </Button>
            
            <Button size="sm" onClick={() => simulateEmailMutation.mutate()} disabled={simulateEmailMutation.isPending} className="gap-1.5 cursor-pointer rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8">
              <Mail size={13} /> Simulate Inbound Email
            </Button>
          </div>
        </div>
  ```

- [ ] **Step 3: Verify and typecheck workspace**
  Run typecheck:
  ```powershell
  bunx tsc --noEmit
  ```
  Expected: exit code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add client/src/pages/SupportInboxPage.tsx
  git commit -m "feat: add sync button and status indicators to SupportInboxPage"
  ```
