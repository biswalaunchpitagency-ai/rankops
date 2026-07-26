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

// Statically configured origins from env var (comma-separated)
const staticOrigins = process.env.TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];


export const auth = betterAuth({
  basePath: "/api/auth",
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
