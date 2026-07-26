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
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => {
        return localStorage.getItem("better-auth.session_token") || undefined;
      },
    },
    onSuccess(context: any) {
      const data = context.data;
      const urlStr = context.request?.url?.toString() || "";
      if (urlStr.includes("/sign-out")) {
        localStorage.removeItem("better-auth.session_token");
      } else if (data?.token) {
        localStorage.setItem("better-auth.session_token", data.token);
      }
    },
  },
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
