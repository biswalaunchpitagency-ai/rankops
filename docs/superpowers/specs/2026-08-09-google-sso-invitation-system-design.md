# Google SSO & User Invitation System Design

**Date:** 2026-08-09  
**Status:** Approved  

---

## 1. Executive Summary

This document specifies the redesign of the authentication and onboarding architecture for the Launchpit Agency / Rankops system. 

Key changes:
1. **Google SSO Only**: Remove Email/Password authentication. Google SSO will be the sole authentication method for all user roles (Admins and Agents).
2. **Invite-Only Access**: Public sign-up is disabled. Only pre-invited users in PostgreSQL can authenticate via Google SSO.
3. **Invitation Flow**: When an Admin creates a new user, an invitation email is sent automatically with a direct link to the login page.
4. **Resend Invite**: Admins can resend invitation emails to pending users from the User Management dashboard.
5. **First-Time Onboarding Email**: Upon a user's initial Google SSO login, an automated confirmation email is sent to all system Administrators notifying them of the new user's onboarding.

---

## 2. Architecture & Data Flow

### 2.1 Database Schema Modifications (`server/prisma/schema.prisma`)

Add `onboardedAt` timestamp to the `User` model:

```prisma
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  role          Role      @default(agent)
  onboardedAt   DateTime? // null = Pending Invite, DateTime = Onboarded
  createdAt     DateTime
  updatedAt     DateTime
  deletedAt     DateTime?
  sessions      Session[]
  accounts      Account[]
  // ... existing relations
}
```

### 2.2 Backend Authentication (`server/src/lib/auth.ts`)

- **Disable Password Login**: Remove `emailAndPassword` configuration block from `betterAuth()`.
- **Enable Google Social Provider**:
  ```ts
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  }
  ```
- **Authorized Email & First-Time Login Guard Hook**:
  Attach a database/authentication hook intercepting Google OAuth sign-in callbacks:
  1. Extract Google OAuth profile `email`.
  2. Query `prisma.user.findUnique({ where: { email, deletedAt: null } })`.
  3. **If user not found**: Reject sign-in with error: `"Your email is not authorized. Please contact an administrator for an invitation."`
  4. **If user exists**:
     - Check `user.onboardedAt`.
     - If `user.onboardedAt === null`:
       - Set `user.onboardedAt = new Date()`.
       - Enqueue **Admin Onboarding Notification Email** to all active `Role.admin` users via `sendEmailJob`.
     - Allow session creation and token issuance.

---

## 3. Endpoints & Email Flow

### 3.1 User Management Endpoints (`server/src/routes/users.ts`)

- **`GET /api/users`**: Include `onboardedAt` in the selected fields.
- **`POST /api/users`**:
  - Request payload: `{ name: string, email: string, role: Role }` (password parameter removed).
  - Validates email uniqueness.
  - Creates user record with `id = crypto.randomUUID()`, `onboardedAt = null`.
  - Enqueues **User Invitation Email** to the new user via `sendEmailJob`.
- **`POST /api/users/:id/resend-invite`**:
  - Admin-only endpoint (`requireAuth`, `requireAdmin`).
  - Finds user by `id`. If user is not found or `onboardedAt !== null`, returns 400 Bad Request.
  - Re-enqueues **User Invitation Email** via `sendEmailJob`.

### 3.2 Email Notification Templates (`server/src/lib/send-email.ts`)

1. **User Invitation Email**:
   - **To**: Invited user email.
   - **Subject**: `You've been invited to Launchpit Agency`
   - **Body (HTML)**: Professional HTML invitation welcoming the user and providing a CTA button linking to `${clientUrl}/login`.
2. **Admin Onboarding Notification**:
   - **To**: All active Admin user emails.
   - **Subject**: `User Onboarded: [User Name]`
   - **Body (HTML)**: Notification alerting admins that `[User Name] ([User Email])` has completed their initial Google SSO login and joined the system.

---

## 4. Frontend Design & UI Updates

### 4.1 Login Page (`client/src/pages/LoginPage.tsx`)

- Remove email input, password input, and standard sign-in form.
- Render a single Google SSO sign-in button: **"Sign in with Google"**.
- Triggers `signIn.social({ provider: "google", callbackURL: "/" })`.
- Display an `ErrorAlert` banner if Google OAuth fails or if redirected with error parameters (e.g. unauthorized email).

### 4.2 User Management UI (`client/src/pages/UsersPage.tsx`, `UsersTable.tsx`, `UserForm.tsx`)

- **`UserForm.tsx`**: Update create user modal to remove password input. Only require **Name**, **Email**, and **Role** selection.
- **`UsersTable.tsx`**:
  - Add **Status Column**:
    - `Onboarded`: Green badge (`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`) with check icon.
    - `Pending Invite`: Amber badge (`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`) with clock icon.
  - Add **"Resend Invite" Button**: Rendered for users with `onboardedAt === null`. Calls `POST /api/users/:id/resend-invite` and triggers a success toast/alert.

---

## 5. Security & Verification Strategy

- **Test Suite Strategy**:
  - Run database migration to apply `onboardedAt`.
  - Update component and API tests to match the new passwordless `UserForm` and Google SSO login flow.
  - Verify email background jobs process properly with mock/dev email logging.
