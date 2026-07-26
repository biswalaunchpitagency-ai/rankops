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

// Build a trusted-origins checker that covers:
// 1. Statically configured origins (TRUSTED_ORIGINS env var)
// 2. Any Vercel preview URL for this project (*.vercel.app)
const staticOrigins = process.env.TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
const trustedOriginsChecker = (origin: string) => {
  if (staticOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith(".vercel.app")) return true;
  } catch {
    // ignore malformed origins
  }
  return false;
};

export const auth = betterAuth({
  basePath: "/api/auth",
  trustedOrigins: (request) => {
    const origin = request.headers.get("origin") || "";
    return trustedOriginsChecker(origin);
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
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
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
});
