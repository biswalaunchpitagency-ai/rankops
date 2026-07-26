# Design Specification: Hybrid Gmail Polling Sync and Idempotency

**Goal:** Create a robust, real-time sync experience for the Helpdesk support agents that guarantees zero duplicate ticket creation and minimizes server resources on the Railway Hobby tier.

---

## 1. Architecture & Design

### 1.1 Server-Side Lock & Status State (`poll-gmail.ts`)
To prevent concurrent runs from overlapping, we use an in-memory lock and sync state object in `poll-gmail.ts`:

```typescript
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
```

All triggers (`setInterval` background loop, mount auto-sync, or manual click) execute the unified `pollGmailOnce()` function. We wrap the body in a try-finally lock:

```typescript
export async function pollGmailOnce() {
  if (syncState.isSyncing) return;
  syncState.isSyncing = true;
  syncState.lastSyncStatus = "idle";
  try {
    // 1. Fetch Google Token
    // 2. Fetch unread messages
    // 3. Process each message (creating ticket or reply)
    // 4. Mark as read in Gmail
    syncState.lastSyncTime = new Date().toISOString();
    syncState.lastSyncStatus = "success";
    syncState.lastSyncError = undefined;
  } catch (error: any) {
    syncState.lastSyncStatus = "error";
    syncState.lastSyncError = error.message || String(error);
  } finally {
    syncState.isSyncing = false;
  }
}
```

---

### 1.2 Express Endpoints (`tickets.ts`)
We expose two REST endpoints under `/api/tickets` to allow the frontend to control and monitor the sync state:

1.  `GET /sync-status` — Returns the current `syncState` JSON. Registered **above** `GET /:id` to avoid route conflicts.
2.  `POST /sync` — Starts `pollGmailOnce()` in the background (asynchronously) if `isSyncing` is false, and immediately returns `202 Accepted` with the current `syncState`.

---

### 1.3 Database Changes (Prisma)
To prevent duplicate ticket or reply generation, we add a unique `gmailMessageId` field to both models:

```prisma
model Ticket {
  // ... existing fields ...
  gmailMessageId String? @unique
}

model Reply {
  // ... existing fields ...
  gmailMessageId String? @unique
}
```

When importing emails, `processIncomingEmail` will check the database:
- If `gmailMessageId` matches an existing ticket or reply, it skips processing and immediately returns the existing record (allowing the poller to safely proceed to mark the email as read in Gmail).

---

### 1.4 Frontend Integration (`SupportInboxPage.tsx`)
*   **Instant Load:** The page queries existing workspace tickets immediately using the standard `["tickets", activeWorkspaceId]` query.
*   **Background Auto-Sync on Mount:** When the component mounts:
    *   It checks the last sync time. If it was more than 2 minutes ago, it triggers `POST /api/tickets/sync`.
*   **Refetch Loop:** React Query polls `GET /api/tickets/sync-status` every 1.5 seconds **only** while `isSyncing === true`.
*   **Auto-Refresh:** When `isSyncing` goes from `true` to `false` and status is `success`, the tickets query is automatically invalidated to update the queue list on screen.
*   **Feedback Display:** 
    *   Next to the Support Inbox header, a small badge is rendered:
        *   If `isSyncing` $\rightarrow$ Spinner + *"Syncing inbox..."*
        *   If `lastSyncStatus === "success"` $\rightarrow$ Muted text: *"Last synced [time] ago"*
        *   If `lastSyncStatus === "error"` $\rightarrow$ Red warning badge: *"Sync error: [Hover to view]"*
    *   A manual **"Sync Inbox"** button that is disabled while `isSyncing === true`.

---

## 2. File Modification Plan

### 2.1 `server/prisma/schema.prisma`
Add unique `gmailMessageId` columns to the `Ticket` and `Reply` models:
```prisma
model Ticket {
  // ...
  gmailMessageId String? @unique
}

model Reply {
  // ...
  gmailMessageId String? @unique
}
```

### 2.2 `server/src/lib/incoming-email.ts`
*   Extend `IncomingEmailData` interface with `gmailMessageId?: string`.
*   In `processIncomingEmail()`, check if `gmailMessageId` already exists in `Ticket` or `Reply` models. If found, skip ticket creation and return.
*   Include `gmailMessageId: data.gmailMessageId` during Prisma `.create()` calls.

### 2.3 `server/src/lib/poll-gmail.ts`
*   Export `SyncState` interface and `syncState` variable.
*   Wrap `pollGmailOnce()` in the syncing lock.
*   Pass `msg.id` as the `gmailMessageId` parameter to `processIncomingEmail()`.

### 2.4 `server/src/routes/tickets.ts`
*   Register `GET /sync-status` and `POST /sync` routes.
*   Ensure routes are registered above dynamic parameters (`/:id`).

### 2.5 `client/src/pages/SupportInboxPage.tsx`
*   Add React Query hook for `sync-status`.
*   Implement automatic trigger on mount with a 2-minute cooldown.
*   Implement automatic cache invalidation of tickets on sync completion.
*   Add the "Sync Inbox" button and header status indicators.

---

## 3. Verification & Testing

1.  **DB Sync:** Run `bun db:push` and check database constraints.
2.  **Double Triggering:** Click the manual sync button twice rapidly. Verify that only one fetch cycle is initiated, and the server returns `isSyncing: true` on the second call.
3.  **Page Reloads:** Start a sync, refresh the browser page. Verify the spinner continues spinning and detects the background process correctly.
4.  **Idempotency / Duplication:** Manually simulate a failure in Gmail API mark-as-read. Verify that a second fetch of the same unread message ID gets skipped without creating a duplicate ticket.
5.  **Error Propagation:** Temporarily disconnect local Wi-Fi or inject invalid OAuth credentials. Verify that the UI displays a clean error badge with the failure message.
