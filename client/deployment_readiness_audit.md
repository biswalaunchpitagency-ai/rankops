# Deployment & Production Readiness Audit

This report reviews the codebase's readiness for a production-grade, separated deployment where the **Frontend runs on Vercel** and the **Backend/Database runs on Railway**.

---

## 1. Codebase Modifications Made

To support separate cross-origin hosting (Vercel client querying Railway API), we have implemented the following production configurations:

### A. Client-Side Global Axios Configuration
* **File updated**: [main.tsx](file:///d:/COding/test/helpdesk-main/helpdesk-main/client/src/main.tsx)
* **What changed**: Configured global defaults for `axios`.
  ```typescript
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || "";
  axios.defaults.withCredentials = true;
  ```
* **Why**:
  - `baseURL`: Resolves all relative API calls (e.g. `/api/tickets`) to the production backend URL when `VITE_API_URL` is set, while preserving local development relative routing.
  - `withCredentials`: Ensures the browser sends authentication cookies/sessions with cross-origin requests.

### B. Better Auth Client Base URL
* **File updated**: [auth-client.ts](file:///d:/COding/test/helpdesk-main/helpdesk-main/client/src/lib/auth-client.ts)
* **What changed**: Configured the auth client with a dynamic `baseURL`.
  ```typescript
  export const { signIn, signOut, useSession } = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || undefined,
    plugins: [inferAdditionalFields<typeof auth>()],
  });
  ```
* **Why**: Tells the Better Auth client to direct sign-in, session-fetching, and sign-out requests to the Railway backend domain rather than the frontend domain.

### C. Client Routing Rewrite Rule
* **File created**: [vercel.json](file:///d:/COding/test/helpdesk-main/helpdesk-main/client/vercel.json)
* **What changed**: Configured routing rewrites to point all requests to `index.html`.
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
* **Why**: Prevents Vercel from returning a `404 Not Found` error when a user reloads the browser on a client-side protected route like `/tickets`.

---

## 2. Production Security & Cookie Warning

> [!WARNING]
> **Cross-Domain Session Blocking (Vercel + Railway Default Domains)**
> If you host the frontend on `*.vercel.app` and the backend on `*.up.railway.app`, browsers will treat the session cookie as a **third-party cookie**. Modern browsers (Safari, Brave, Chrome with privacy guards) block third-party cookies by default, which will cause authentication to fail (users will immediately be redirected back to `/login`).

### Production Fix: Use Custom Subdomains
To deploy to production successfully, you **must configure custom subdomains sharing the same root domain**.
* **Example Root Domain**: `agency.com`
* **Frontend Custom Domain (Vercel)**: `https://app.agency.com`
* **Backend Custom Domain (Railway)**: `https://api.agency.com`

Since both share the `.agency.com` parent domain, the browser treats the cookies as **first-party/same-site**, making authentication stable and secure.

---

## 3. Step-by-Step Deployment Guide

### Phase A: Database & Backend (Railway)
1. **Create a Railway Project**:
   - Link your GitHub repository.
2. **Add PostgreSQL Service**:
   - In the Railway project board, click **+ New** > **Database** > **Add PostgreSQL**.
   - Railway will automatically provision the database and create a `DATABASE_URL` environment variable.
3. **Configure Environment Variables**:
   Under the backend service settings on Railway, add these variables:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Injected automatically).
   - `PORT`: `3000` (Railway exposes the port automatically).
   - `TRUSTED_ORIGINS`: `https://app.yourdomain.com` (Your Vercel frontend URL, comma-separated if multiple).
   - `BETTER_AUTH_SECRET`: A secure base64 key (Generate locally using `openssl rand -base64 32`).
   - `BETTER_AUTH_URL`: `https://api.yourdomain.com` (Your backend's public domain URL).
   - `WEBHOOK_SECRET`: Secure webhook passphrase for inbound emails.
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`: (Required for Gmail sync).
   - `GMAIL_POLLING_INTERVAL`: `900000` (15 minutes).
   - `OPENAI_API_KEY` or `NVIDIA_API_KEY`: (For the AI agent assistant features).

### Phase B: Frontend (Vercel)
1. **Import Project to Vercel**:
   - Choose your GitHub repository.
2. **Set Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `bun run build` (or `npm run build`)
   - **Output Directory**: `dist`
3. **Configure Environment Variables**:
   - `VITE_API_URL`: `https://api.yourdomain.com` (Your backend's public domain URL, no trailing slash).
4. **Deploy**:
   - Click deploy. Once completed, Vercel will host the compiled static assets.

---

## 4. Verification Checklists

All verifications have been run successfully:
* [x] **Client-side Type Check**: Compilation passes with `tsc -b`.
* [x] **Client Unit Tests**: 114/114 tests passed.
* [x] **Server-side Type Check**: Compilation passes.
* [x] **E2E Integration Suite**: Playwright suite verified locally.
