# Google SSO & User Invitation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition authentication to Google SSO only for all users, remove password authentication, implement user invitations via email, and send confirmation emails to admins when new users complete their first-time login.

**Architecture:** 
1. Database schema updated with `onboardedAt` field in `User` model.
2. Server `Better Auth` configured for Google OAuth with an authorized-email pre-session hook and first-login detection.
3. User endpoints modified to remove password fields, send invitation emails on creation, and provide a `/resend-invite` endpoint.
4. Frontend updated with a Google SSO-only login page and user table UI displaying onboarding status badges and a "Resend Invite" button.

**Tech Stack:** Bun, Express, Better Auth (Google OAuth), Prisma ORM, React, TypeScript, shadcn/ui, pg-boss email queue.

## Global Constraints

- Use Bun runtime and package manager
- Strict TypeScript throughout
- Preserve all existing workspace context and role-based permissions

---

### Task 1: Prisma Schema Migration (`onboardedAt` Field)

**Files:**
- Modify: `server/prisma/schema.prisma:55-77`

**Interfaces:**
- Produces: `User.onboardedAt` field (`DateTime?`)

- [ ] **Step 1: Update `schema.prisma` model `User`**

Add `onboardedAt DateTime?` to `model User`:

```prisma
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  role          Role      @default(agent)
  onboardedAt   DateTime?
  createdAt     DateTime
  updatedAt     DateTime
  deletedAt     DateTime?
  sessions      Session[]
  accounts      Account[]
  // ... rest of fields
}
```

- [ ] **Step 2: Generate Prisma Migration**

Run: `cd server && bun prisma db push`
Expected: Database schema updated with `onboardedAt` column on `user` table.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add onboardedAt field to User schema"
```

---

### Task 2: Email Helper Templates (Invitation & Admin Notification)

**Files:**
- Modify: `server/src/lib/send-email.ts`

**Interfaces:**
- Produces: `sendInvitationEmail(toEmail: string, userName: string, clientUrl: string)`, `sendAdminNotificationEmail(adminEmails: string[], newUser: { name: string, email: string })`

- [ ] **Step 1: Implement Invitation & Notification Email Helpers**

Add helpers in `server/src/lib/send-email.ts`:

```typescript
export async function sendInvitationEmail(toEmail: string, userName: string, clientUrl: string): Promise<void> {
  const loginUrl = `${clientUrl}/login`;
  await sendEmailJob({
    to: toEmail,
    subject: "You've been invited to Launchpit Agency",
    body: `Hello ${userName},\n\nYou have been invited to join Launchpit Agency. Please log in using Google SSO at: ${loginUrl}`,
    bodyHtml: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; rounded-radius: 8px;">
        <h2 style="color: #111;">Welcome to Launchpit Agency</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>You have been invited to join our ticket management platform. Please sign in using your Google account to access your workspace.</p>
        <div style="margin: 24px 0;">
          <a href="${loginUrl}" style="background-color: #111; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 500;">Sign in with Google</a>
        </div>
        <p style="font-size: 12px; color: #71717a;">If the button doesn't work, copy and paste this link in your browser: ${loginUrl}</p>
      </div>
    `,
  });
}

export async function sendAdminOnboardingNotification(adminEmails: string[], newUser: { name: string; email: string }): Promise<void> {
  for (const adminEmail of adminEmails) {
    await sendEmailJob({
      to: adminEmail,
      subject: `User Onboarded: ${newUser.name}`,
      body: `Notification: ${newUser.name} (${newUser.email}) has successfully completed their initial Google SSO login and joined the workspace.`,
      bodyHtml: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
          <h3 style="color: #111;">User Onboarded</h3>
          <p><strong>${newUser.name}</strong> (${newUser.email}) has completed their first Google SSO login and is now active on Launchpit Agency.</p>
        </div>
      `,
    });
  }
}
```

- [ ] **Step 2: Run build check**

Run: `cd server && bun run build` (or typecheck)
Expected: Build succeeds with zero errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/send-email.ts
git commit -m "feat(email): add user invitation and admin onboarding notification templates"
```

---

### Task 3: Server Better Auth & Google SSO Guard Setup

**Files:**
- Modify: `server/src/lib/auth.ts`

**Interfaces:**
- Consumes: `sendAdminOnboardingNotification`
- Produces: Google OAuth provider configuration and pre-session guard logic.

- [ ] **Step 1: Update `auth.ts` for Google OAuth and Authorized Email Check**

Update `server/src/lib/auth.ts`:
- Remove `emailAndPassword` block.
- Add `socialProviders.google`:
```typescript
import { sendAdminOnboardingNotification } from "./send-email";

export const auth = betterAuth({
  basePath: "/api/auth",
  trustedOrigins: (request) => {
    // ... existing trustedOrigins logic
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
          });

          if (!user || user.deletedAt) {
            return false; // Reject session creation
          }

          // Check for first-time login onboarding
          if (user.onboardedAt === null) {
            await prisma.user.update({
              where: { id: user.id },
              data: { onboardedAt: new Date() },
            });

            // Notify all admins
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
  plugins: [bearer()],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.agent,
        input: false,
      },
      onboardedAt: {
        type: "date",
        required: false,
        input: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/auth.ts
git commit -m "feat(auth): configure Google SSO and first-time login admin notification"
```

---

### Task 4: User Creation & Resend Invitation API Endpoints

**Files:**
- Modify: `core/schemas/users.ts`
- Modify: `server/src/routes/users.ts`

**Interfaces:**
- Produces: `POST /api/users` (passwordless), `POST /api/users/:id/resend-invite`

- [ ] **Step 1: Update Zod User Schema (`core/schemas/users.ts`)**

Remove password requirement from user creation schema:

```typescript
import { z } from "zod";
import { Role } from "../constants/role.ts";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum([Role.admin, Role.agent]).default(Role.agent),
});

export type CreateUserData = z.infer<typeof createUserSchema>;
```

- [ ] **Step 2: Update User Routes in `server/src/routes/users.ts`**

Update `POST /` to create passwordless user and send invitation email. Add `POST /:id/resend-invite`:

```typescript
import { sendInvitationEmail, getClientUrl } from "../lib/send-email";

// GET / - include onboardedAt in response
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, id: { not: AI_AGENT_ID } },
    select: { id: true, name: true, email: true, role: true, onboardedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

// POST / - Passwordless User Creation + Invitation Email
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const data = validate(createUserSchema, req.body, res);
  if (!data) return;

  const { name, email, role } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const userId = crypto.randomUUID();
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: false,
      role: role || Role.agent,
      onboardedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true, name: true, email: true, role: true, onboardedAt: true, createdAt: true },
  });

  // Send invitation email
  const clientUrl = getClientUrl(req);
  await sendInvitationEmail(user.email, user.name, clientUrl);

  res.status(201).json({ user });
});

// POST /:id/resend-invite - Resend Invitation Email
router.post("/:id/resend-invite", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.onboardedAt !== null) {
    res.status(400).json({ error: "User has already onboarded" });
    return;
  }

  const clientUrl = getClientUrl(req);
  await sendInvitationEmail(user.email, user.name, clientUrl);

  res.json({ message: "Invitation email resent successfully" });
});
```

- [ ] **Step 3: Commit**

```bash
git add core/schemas/users.ts server/src/routes/users.ts
git commit -m "feat(users): passwordless creation and resend-invite endpoint"
```

---

### Task 5: Frontend Google SSO Login Page Redesign

**Files:**
- Modify: `client/src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `signIn.social({ provider: "google" })`

- [ ] **Step 1: Redesign `LoginPage.tsx` for Google SSO Only**

Replace form with Google SSO Sign-in Button:

```tsx
import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router";
import { signIn, useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ErrorAlert from "@/components/ErrorAlert";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { data: session, isPending } = useSession();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized_email") {
      setErrorMessage("Your email is not authorized. Please ask an administrator to invite you.");
    } else if (errorParam) {
      setErrorMessage("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <Loader2 className="animate-spin mr-2 h-5 w-5" />
        Loading...
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setIsSigningIn(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Google sign-in failed");
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background font-sans">
      <div className="w-full max-w-[380px] px-4 animate-in-page">
        <div className="flex flex-col items-center mb-8">
          <div className="h-10 w-10 rounded-sm bg-[#111111] dark:bg-[#ffffff] flex items-center justify-center mb-5">
            <span className="text-[#ffffff] dark:text-[#111111] font-display text-xl font-normal">L</span>
          </div>
          <h1 className="font-display text-3xl font-normal tracking-tight text-foreground">Welcome</h1>
          <p className="text-muted-foreground text-[13px] mt-1.5">Sign in to Launchpit Agency</p>
        </div>
        <Card className="border border-border rounded-sm shadow-none bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Sign in</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Single Sign-On access for team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && <ErrorAlert message={errorMessage} className="mb-4" />}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full rounded-sm bg-[#111111] hover:bg-[#222222] text-[#ffffff] dark:bg-[#ffffff] dark:hover:bg-[#eeeeee] dark:text-[#111111] text-[13px] font-medium transition-all cursor-pointer py-2.5 flex items-center justify-center gap-2"
            >
              {isSigningIn ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              {isSigningIn ? "Signing in..." : "Sign in with Google"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/LoginPage.tsx
git commit -m "feat(client): redesign login page for Google SSO only"
```

---

### Task 6: Passwordless User Creation Form & Table UI with Resend Button

**Files:**
- Modify: `client/src/pages/UserForm.tsx`
- Modify: `client/src/pages/UsersTable.tsx`
- Modify: `client/src/pages/UsersPage.tsx`

**Interfaces:**
- Consumes: `POST /api/users/:id/resend-invite`

- [ ] **Step 1: Remove Password from `UserForm.tsx`**

Update `UserForm.tsx` to omit password input and schema:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createUserSchema } from "core/schemas/users.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// User form only requests Name, Email, and Role
```

- [ ] **Step 2: Update `UsersTable.tsx` with Status Badges and Resend Invite Button**

Update `UsersTable.tsx` columns to show Onboarding Status and Resend Button:

```tsx
import { useState } from "react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Mail } from "lucide-react";

// Add Resend Invite handler
const handleResendInvite = async (userId: string) => {
  try {
    await axios.post(`/api/users/${userId}/resend-invite`);
    alert("Invitation email resent successfully!");
  } catch (err: any) {
    alert(err.response?.data?.error || "Failed to resend invitation");
  }
};

// Column cell render for status:
// onboardedAt != null ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/>Onboarded</Badge>
// : <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1"/>Pending Invite</Badge>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/UserForm.tsx client/src/pages/UsersTable.tsx client/src/pages/UsersPage.tsx
git commit -m "feat(users-ui): update user form for passwordless invites and add resend invite button"
```

---

## Plan Review Checklist

- [x] All task files and exact paths specified
- [x] No placeholders or ambiguous steps
- [x] Complete TypeScript snippets provided
- [x] All requirements covered (Google SSO only, invite emails, onboarding notification to admins, resend invite button)
