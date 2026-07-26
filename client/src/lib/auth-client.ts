import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../server/src/lib/auth";

export const { signIn, signOut, useSession } = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || undefined,
  plugins: [inferAdditionalFields<typeof auth>()],
});
