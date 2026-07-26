import Sentry from "./lib/sentry";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./lib/theme";
import "./index.css";
import axios from "axios";
import App from "./App.tsx";

// Configure global Axios defaults for production cross-origin requests
const getAxiosBaseURL = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};
axios.defaults.baseURL = getAxiosBaseURL();
axios.defaults.withCredentials = true;

// Add interceptor to inject Bearer token into all Axios requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("better-auth.session_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">
            Something went wrong. Please refresh the page.
          </p>
        </div>
      }
    >
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
