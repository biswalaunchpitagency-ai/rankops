# Design Spec: Workspace-Scoped Multi-Tenancy (Tickets & Dashboard)

**Date:** 2026-07-10  
**Status:** Approved  
**Topic:** Scoping the Support Tickets and Dashboard components under Workspace-level route isolation (Approach 1).

---

## 1. Overview & Architecture

To achieve a true multi-tenant workspace experience, all support tickets, conversation replies, and dashboard metric queries must be scoped to the workspace context. We will transition from flat routes (e.g. `/tickets`) to nested workspace-scoped routes (e.g. `/workspaces/:workspaceId/tickets`).

### Context & Flow Diagram
```
Client URL                                    Express Route Handler                        Database Scoping
-------------------------                     ------------------------------               -------------------------
/workspaces/:wsId/tickets     ==[HTTP GET]==> /api/workspaces/:workspaceId/tickets =====>  WHERE "workspaceId" = wsId
                                                  |
                                                  |--> [requireWorkspaceMember]
                                                  |    (validates user membership)
```

---

## 2. Component Design & Changes

### A. Database Schema (`server/prisma/schema.prisma`)
1. **Model Modification:**
   - Link `Ticket` to `Workspace` via `workspaceId String` and define a Cascade relation.
   - Update `Workspace` to list `tickets Ticket[]`.

2. **Seeding Backfill (`server/prisma/reset-db.ts`):**
   - Update the seeding script to assign a valid `workspaceId` to all dummy tickets.

### B. Backend API (`server/src`)
1. **Workspace Membership Middleware (`server/src/middleware/require-workspace-member.ts`):**
   - Read `:workspaceId` parameter from req.params.
   - Query `WorkspaceMember` table where `workspaceId` matches and `userId = req.user.id`.
   - If not present, abort with `403 Forbidden`. If valid, inject `req.workspaceId` and `req.workspaceRole` into the request.

2. **Endpoint Remapping (`server/src/index.ts`):**
   - Change ticket router mounts:
     - `/api/tickets` -> `/api/workspaces/:workspaceId/tickets`
     - `/api/tickets/:ticketId/replies` -> `/api/workspaces/:workspaceId/tickets/:ticketId/replies`
   - Apply `requireWorkspaceMember` middleware to validate access before hitting controller routes.

3. **Controller Updates (`server/src/routes/tickets.ts` and `replies.ts`):**
   - Enable `mergeParams: true` in Express routers.
   - Inject `workspaceId: req.workspaceId` into all `prisma.ticket.*` query clauses (`where`, `create`, `update`).
   - Inline the raw CTE query for ticket statistics in `tickets.ts` and filter by `workspaceId`.

### C. Frontend Navigation & Pages (`client/src`)
1. **Router Restructuring (`client/src/App.tsx`):**
   - Move `HomePage`, `TicketsPage`, and `TicketDetailPage` under `/workspaces/:workspaceId/*` sub-routes.
   - Add a `RootRedirect` component that automatically checks the user's workspaces and redirects to the first available workspace dashboard.

2. **Sidebar & Switcher Scoping (`client/src/components/Layout.tsx`):**
   - Extract `workspaceId` using `matchPath`.
   - Direct Dashboard and Ticket sidebar links to `/workspaces/:workspaceId/dashboard` and `/workspaces/:workspaceId/tickets`.

3. **Page Data Fetching:**
   - Update `useParams()` usage on nested pages to pull `workspaceId` and append it to queries (e.g. `axios.get('/api/workspaces/' + workspaceId + '/tickets')`).

---

## 3. Error Handling & Edge Cases
- **Non-existent workspace:** The middleware returns `403 Forbidden` or `404 Not Found` if a user attempts to access a workspace that does not exist or they are not member of.
- **Switching workspaces mid-session:** Whenever the workspace switcher updates the URL path, React Query's `queryKey` dependency on `:workspaceId` will automatically trigger a refetch of all relevant dashboard and ticket data, preventing cross-workspace stale data display.
