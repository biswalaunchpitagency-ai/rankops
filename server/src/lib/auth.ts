import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: process.env.NODE_ENV === "test" ? path.resolve(process.cwd(), ".env.test") : undefined,
  override: true
});
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Role } from "core/constants/role.ts";
import prisma from "../db";

import { sendAdminOnboardingNotification } from "./send-email";

// Statically configured origins from env var (comma-separated)
const staticOrigins = process.env.TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];


export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
    },
  },
  // trustedOrigins must return string[] — Better Auth spreads the result into its origins array
  trustedOrigins: (request) => {
    if (!request?.headers) return staticOrigins;
    const origin = request.headers.get("origin") || "";
    if (!origin) return staticOrigins;
    // Accept any Vercel preview URL in addition to explicitly configured origins
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith(".vercel.app")) {
        return [...staticOrigins, origin];
      }
    } catch {
      // ignore malformed origins
    }
    return staticOrigins;
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.SMTP_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.SMTP_CLIENT_SECRET || "",
      prompt: "select_account",
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
  plugins: [
    // Enables `Authorization: Bearer <token>` session lookup on every endpoint,
    // which is required when frontend and backend are on different domains.
    bearer(),
  ],
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
