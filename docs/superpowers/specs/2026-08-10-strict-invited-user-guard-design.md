# Strict Invited-User Guard for Google SSO Design Specification

## Problem
In standard Better Auth Google SSO implementations, if an uninvited user signs in using their Google Account (`randomperson@gmail.com`), Better Auth auto-creates a new `User` record by default. This allows uninvited users to bypass the admin invitation workflow.

## Goal
Restrict Google SSO login strictly to users who have been explicitly pre-registered in the database (via Admin invitation `POST /api/users` or initial database seed). All uninvited Google accounts attempting to sign in must be rejected at the authentication level and redirected to the frontend login page with a clear unauthorized error message.

## Proposed Architecture

### 1. Database Hook Guard (`server/src/lib/auth.ts`)

Configure `databaseHooks.user.create.before` in `betterAuth`:

```ts
databaseHooks: {
  user: {
    create: {
      before: async (user) => {
        // Query PostgreSQL for pre-created user record by email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // Reject user creation if email is not pre-registered or has been deleted
        if (!existingUser || existingUser.deletedAt) {
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
          return false;
        }

        // Handle first-time onboarding confirmation for invited users
        if (user.onboardedAt === null) {
          await prisma.user.update({
            where: { id: user.id },
            data: { onboardedAt: new Date() },
          });

          // Notify system administrators
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
}
```

### 2. Request Data Flow

1. **User Sign-In Trigger**:
   - User clicks **"Sign in with Google"** at `https://rankops-client.vercel.app/login`.
   - Better Auth redirects the user to Google OAuth consent screen.

2. **Google OAuth Callback**:
   - User authorizes Google SSO. Google redirects back to `https://rankops-backend-server-production.up.railway.app/api/auth/callback/google`.

3. **Backend Validation**:
   - Better Auth receives Google account metadata (`user.email`).
   - `databaseHooks.user.create.before` runs.
   - **Case A (Uninvited User)**: `prisma.user.findUnique({ where: { email } })` returns `null`. Hook returns `false`. Better Auth cancels sign-in and redirects user to `/login?error=unauthorized_email`.
   - **Case B (Invited/Pre-Registered User)**: `prisma.user.findUnique({ where: { email } })` finds user record. Hook returns `true`. Better Auth links Google account and creates a valid session.

4. **Frontend Error Handling (`client/src/pages/LoginPage.tsx`)**:
   - The login page checks for `?error=unauthorized_email` parameter in the URL.
   - Displays alert: *"Your email is not authorized. Please ask an administrator to invite you."*

## Testing & Verification Plan

1. **Uninvited User Login**:
   - Attempt to log in with an email address not present in the `User` database table.
   - Verify that account creation is blocked and the user is redirected to the login page with the unauthorized error message.

2. **Invited User First-Time Login**:
   - Create an invitation for a test email via Admin User Management panel (`POST /api/users`).
   - Log in using that Google Account.
   - Verify that login succeeds, `onboardedAt` timestamp is set in PostgreSQL, and Admin onboarding notification email is sent.

3. **Type Safety & Build Checks**:
   - Run `bun x tsc --noEmit` in `server` directory.
   - Run `bun x tsc -b` in `client` directory.
