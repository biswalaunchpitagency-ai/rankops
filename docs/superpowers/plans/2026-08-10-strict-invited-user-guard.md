# Strict Invited-User Guard for Google SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict Google SSO authentication strictly to invited and pre-registered users, blocking any uninvited Google accounts at the auth level.

**Architecture:** Add `databaseHooks.user.create.before` to Better Auth (`server/src/lib/auth.ts`) which checks PostgreSQL for an existing `User` record by email before allowing account creation. If no user record exists, return `false` to abort OAuth sign-in and redirect to `/login?error=unauthorized_email`.

**Tech Stack:** TypeScript, Node.js, Express, Better Auth, Prisma ORM, PostgreSQL.

## Global Constraints
- Do not alter existing schema fields.
- Preserve existing invitation email and onboarding confirmation workflows.
- Zero TypeScript build errors on both client (`bun x tsc -b`) and server (`bun x tsc --noEmit`).

---

### Task 1: Add User Creation Guard in Better Auth

**Files:**
- Modify: `server/src/lib/auth.ts:48-86`

**Interfaces:**
- Consumes: `prisma.user.findUnique({ where: { email } })`
- Produces: `databaseHooks.user.create.before` guard returning `boolean`

- [ ] **Step 1: Update `server/src/lib/auth.ts` to add `user.create.before` hook**

Open `server/src/lib/auth.ts` and add `user.create.before` under `databaseHooks`:

```ts
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Check if this email is pre-registered (via admin invitation or seed)
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser || existingUser.deletedAt) {
            // Block account creation for uninvited users
            return false;
          }

          return true;
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
          });

          if (!user || user.deletedAt) {
            return false; // Reject session creation for unauthorized or soft-deleted users
          }

          // Check if this is the user's first time logging in (Onboarding Confirmation)
          if (user.onboardedAt === null) {
            await prisma.user.update({
              where: { id: user.id },
              data: { onboardedAt: new Date() },
            });

            // Notify all system administrators
            const admins = await prisma.user.findMany({
              where: { role: Role.admin, deletedAt: null },
              select: { email: true },
            });
            const adminEmails = admins.map((a) => a.email);
            if (adminEmails.length > 0) {
              await sendAdminOnboardingNotification(adminEmails, {
                name: user.name,
                email: user.email,
              });
            }
          }

          return true;
        },
      },
    },
  },
```

- [ ] **Step 2: Verify server TypeScript compilation**

Run command in `server/`:
`bun x tsc --noEmit`
Expected output: Exit code 0 (no compilation errors).

- [ ] **Step 3: Verify client TypeScript compilation**

Run command in `client/`:
`bun x tsc -b`
Expected output: Exit code 0 (no compilation errors).

- [ ] **Step 4: Commit changes**

```bash
git add server/src/lib/auth.ts
git commit -m "feat(auth): restrict Google SSO user creation strictly to invited users"
```

---

### Task 2: Push Changes to Remote Repository

**Files:**
- Repository remote: `origin main`

- [ ] **Step 1: Push commits to GitHub**

Run command:
`git push origin main`
Expected output: Commit pushed to `https://github.com/biswalaunchpitagency-ai/rankops.git`.
