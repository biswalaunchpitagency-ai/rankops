import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) return undefined;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

export const { signIn, signOut, useSession } = createAuthClient({
  baseURL: getBaseURL(),
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
