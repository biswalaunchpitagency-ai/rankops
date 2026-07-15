# SEO Agency Integration — Plan 1: Database Schema Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the Prisma schema with Client, SOP, SOPStep, TimeLog, KnowledgeBase models and add optional fields to Ticket and Task.

**Architecture:** Add 4 new models workspace-scoped via `workspaceId`. Extend `Ticket` and `Task` with optional `clientId`, `phase`, `impact`, `estHours`, `checklist` fields. Run migration and regenerate Prisma client.

**Tech Stack:** Prisma ORM, PostgreSQL, Bun (run commands from `server/` dir)

## Global Constraints
- All new models must have `workspaceId String` + `workspace Workspace @relation(...)` for tenant isolation
- Bun is the runtime — all commands use `bun` not `npm`
- Prisma commands run from `server/` directory: `cd server && bunx prisma ...`
- `checklist` stored as `Json?` (array of `{text: string, done: boolean}`)
- `emailDomains` on Client stored as `String[]` (PostgreSQL array)
- Do NOT use `enum` for `phase` or `clientStatus` — use `String` with a default value

---

### Task 1: Add Client model to schema

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Produces: `Client` model with fields `id`, `name`, `type`, `retainerHours`, `rate`, `status`, `notes`, `emailDomains`, `workspaceId`, `createdAt`, `updatedAt`

- [ ] **Step 1: Open `server/prisma/schema.prisma` and add the Client model** after the `Workspace` model block:

```prisma
model Client {
  id            String    @id @default(uuid())
  name          String
  type          String?
  retainerHours Float     @default(0)
  rate          Float     @default(0)
  status        String    @default("Active")
  notes         String?
  emailDomains  String[]
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  tickets       Ticket[]
  tasks         Task[]

  @@map("client")
}
```

- [ ] **Step 2: Add `clients` back-relation to the `Workspace` model**

Find the `Workspace` model block and add:
```prisma
  clients Client[]
```

- [ ] **Step 3: Verify schema parses cleanly**

```bash
cd server && bunx prisma validate
```
Expected output: `The schema at prisma/schema.prisma is valid`

---

### Task 2: Add SOP and SOPStep models

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Produces: `SOP` model with `id`, `title`, `category`, `tools`, `workspaceId`, `steps SOPStep[]`
- Produces: `SOPStep` model with `id`, `text`, `position`, `sopId`

- [ ] **Step 1: Add SOP and SOPStep models** after the `Client` model:

```prisma
model SOP {
  id          String    @id @default(uuid())
  title       String
  category    String
  tools       String?
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  steps       SOPStep[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("sop")
}

model SOPStep {
  id        String   @id @default(uuid())
  text      String
  position  Int
  sopId     String
  sop       SOP      @relation(fields: [sopId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@map("sop_step")
}
```

- [ ] **Step 2: Add `sops` back-relation to the `Workspace` model**

```prisma
  sops SOP[]
```

- [ ] **Step 3: Validate**

```bash
cd server && bunx prisma validate
```
Expected: no errors

---

### Task 3: Add TimeLog model

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Consumes: `User`, `Task`, `Ticket`, `Workspace` models (already exist)
- Produces: `TimeLog` model with `id`, `hours`, `date`, `note`, `userId`, `taskId?`, `ticketId?`, `workspaceId`

- [ ] **Step 1: Add TimeLog model** after `SOPStep`:

```prisma
model TimeLog {
  id          String    @id @default(uuid())
  hours       Float
  date        DateTime  @default(now())
  note        String?
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId      String?
  task        Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)
  ticketId    Int?
  ticket      Ticket?   @relation(fields: [ticketId], references: [id], onDelete: SetNull)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@map("time_log")
}
```

- [ ] **Step 2: Add back-relations**

In `User` model, add:
```prisma
  timeLogs TimeLog[]
```

In `Task` model, add:
```prisma
  timeLogs TimeLog[]
```

In `Ticket` model, add:
```prisma
  timeLogs TimeLog[]
```

In `Workspace` model, add:
```prisma
  timeLogs TimeLog[]
```

- [ ] **Step 3: Validate**

```bash
cd server && bunx prisma validate
```

---

### Task 4: Add KnowledgeBase model

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Produces: `KnowledgeBase` model with `id`, `title`, `category`, `keywords`, `content`, `workspaceId`

- [ ] **Step 1: Add KnowledgeBase model** after `TimeLog`:

```prisma
model KnowledgeBase {
  id          String   @id @default(uuid())
  title       String
  category    String
  keywords    String
  content     String
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("knowledge_base")
}
```

- [ ] **Step 2: Add `knowledgeBase` back-relation to Workspace**

```prisma
  knowledgeBase KnowledgeBase[]
```

- [ ] **Step 3: Validate**

```bash
cd server && bunx prisma validate
```

---

### Task 5: Extend Ticket and Task with new optional fields

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Ticket: adds `clientId String?`, `client Client?`, `phase String?`, `impact String?`, `checklist Json?`
- Task: adds `clientId String?`, `client Client?`, `estHours Float?`, `impact String?`, `checklist Json?`

- [ ] **Step 1: Extend the `Ticket` model**

Add these fields inside the `Ticket` model block:
```prisma
  clientId  String?
  client    Client?  @relation(fields: [clientId], references: [id], onDelete: SetNull)
  phase     String?
  impact    String?
  checklist Json?
```

- [ ] **Step 2: Extend the `Task` model**

Add these fields inside the `Task` model block:
```prisma
  clientId  String?
  client    Client?  @relation(fields: [clientId], references: [id], onDelete: SetNull)
  estHours  Float?
  impact    String?
  checklist Json?
```

- [ ] **Step 3: Validate**

```bash
cd server && bunx prisma validate
```
Expected: no errors

---

### Task 6: Run migration and regenerate client

**Files:**
- Creates: `server/prisma/migrations/` new migration files

- [ ] **Step 1: Create and apply the migration**

```bash
cd server && bunx prisma migrate dev --name seo_agency_features
```

Expected output contains:
```
The following migration(s) have been created and applied...
✓ Generated Prisma Client
```

- [ ] **Step 2: Confirm new tables exist in DB**

```bash
cd server && bunx prisma studio
```

Open browser at `http://localhost:5555`. Verify tables `client`, `sop`, `sop_step`, `time_log`, `knowledge_base` exist with correct columns.

Close Prisma Studio with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add Client, SOP, TimeLog, KnowledgeBase models and extend Ticket/Task"
```
