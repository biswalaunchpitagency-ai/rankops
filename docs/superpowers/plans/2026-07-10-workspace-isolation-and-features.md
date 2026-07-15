# Workspace Isolation & Support-Linear Features Plan

> **Approval Gate:** Each task below lists ONLY the operations planned. Before writing any code for a task, I will summarize what I'm about to do and wait for your "go ahead" before proceeding.

**Goal:** Implement workspace isolation for tickets on the backend (schema + routes), add a Teams management API, and support manual approval for AI-generated reply emails.

**Architecture:** Backend-only changes. Intercept ticket/reply routes with a `requireWorkspaceMember` middleware. Add teams CRUD API. Save AI-generated replies as drafts requiring manual confirmation before email dispatch. Frontend routing and pages remain unchanged.

**Tech Stack:** Express, Prisma, Nodemailer.

---

## Task 1 — Database: Add `workspaceId` to Ticket

**Status:** ⏳ Awaiting approval

**Operations:**
1. In `server/prisma/schema.prisma`: add `workspaceId String` field and `workspace Workspace` relation to the `Ticket` model.
2. In `server/prisma/schema.prisma`: add `tickets Ticket[]` back-relation to the `Workspace` model.
3. In `server/prisma/reset-db.ts`: pass `workspaceId` (the seeded workspace) when creating each dummy ticket.
4. Run `npx prisma db push` in `server/` to sync schema, then re-run `npm run db:reset` to repopulate seed data.

**Files touched:** `server/prisma/schema.prisma`, `server/prisma/reset-db.ts`

---

## Task 2 — Backend: Workspace Membership Middleware & Route Remounting

**Status:** ⏳ Awaiting approval

**Operations:**
1. Create `server/src/middleware/require-workspace-member.ts`: reads `:workspaceId` from route params, verifies the caller is a `WorkspaceMember`, injects `req.workspaceId` and `req.workspaceRole`.
2. In `server/src/index.ts`: remount `ticketsRouter` from `/api/tickets` → `/api/workspaces/:workspaceId/tickets`, and `repliesRouter` from `/api/tickets/:ticketId/replies` → `/api/workspaces/:workspaceId/tickets/:ticketId/replies`. Apply `requireWorkspaceMember` before each.
3. In `server/src/routes/tickets.ts`: enable `Router({ mergeParams: true })`, add `workspaceId: req.workspaceId` filter to every Prisma query (list, detail, patch, stats, daily-volume).
4. In `server/src/routes/tickets.ts`: replace the call to the Postgres function `get_ticket_stats()` with an inline workspace-filtered CTE so no DB migration is needed.
5. In `server/src/routes/replies.ts`: enable `Router({ mergeParams: true })`, add workspace join check where needed.

**Files touched:** `server/src/middleware/require-workspace-member.ts` *(new)*, `server/src/index.ts`, `server/src/routes/tickets.ts`, `server/src/routes/replies.ts`

---

## Task 3 — Backend: Teams Management API

**Status:** ⏳ Awaiting approval

**Operations:**
1. Create `server/src/routes/teams.ts` with four endpoints:
   - `GET /` — list all teams in the workspace (including member names).
   - `POST /` — create a new team (name required).
   - `DELETE /:teamId` — delete a team.
   - `POST /:teamId/members` — add a workspace member to a team by `userId`.
2. In `server/src/index.ts`: register the teams router at `/api/workspaces/:workspaceId/teams` with `requireAuth` + `requireWorkspaceMember`.

**Files touched:** `server/src/routes/teams.ts` *(new)*, `server/src/index.ts`

---

## Task 4 — Backend: Manual AI Reply Approval

**Status:** ⏳ Awaiting approval

**Operations:**
1. In `server/src/routes/replies.ts`: add `POST /:replyId/approve` endpoint — sets `isDraft: false` on the reply, then dispatches the outbound email via the existing `sendEmailJob` helper.
2. Verify all existing code paths that auto-generate AI replies already create them with `isDraft: true` (no auto-send on creation).

**Files touched:** `server/src/routes/replies.ts`

---

## Execution Order

```
Task 1 (DB schema) → Task 2 (Backend middleware & routes) → Task 3 (Teams API) → Task 4 (Draft approval)
```

Each task requires explicit approval before any code is written.
