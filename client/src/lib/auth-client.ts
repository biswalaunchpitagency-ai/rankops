import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const { signIn, signOut, useSession } = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || undefined,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
        },
        deletedAt: {
          type: "date",
        },
      },
    }),
  ],
});
