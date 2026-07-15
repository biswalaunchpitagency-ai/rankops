# Design Spec: Rebranding Helpdesk to Launchpit Agency

- **Date:** 2026-07-10
- **Status:** Proposed
- **Author:** Antigravity AI

## 1. Overview
The goal of this task is to rebrand the client-facing and AI-agent-facing components of the Helpdesk application to **Launchpit Agency**.

As agreed:
- **Approach 1 (User-Facing / Client Rebranding)** is implemented first.
- Internal database details (connection strings, database names), package dependencies, internal storage keys (`helpdesk-theme`), and docker image commands will remain the same to prevent breaking development environments.

---

## 2. Rebranding Scope

### 2.1 User Interface & HTML Rebranding
We will update user-visible text, page titles, and layout components:
1. **`client/index.html`**:
   - Change `<title>Helpdesk</title>` to `<title>Launchpit Agency</title>`.
2. **`client/src/components/Layout.tsx`**:
   - Change sidebar/header title `Helpdesk` to `Launchpit Agency`.
3. **`client/src/pages/LoginPage.tsx`**:
   - Change header `"Sign in to your helpdesk account"` to `"Sign in to your Launchpit Agency account"`.
4. **End-to-End Tests (`e2e/tests/auth.spec.ts` & `e2e/fixtures/auth.ts`)**:
   - Update Playwright assertions from `helpdesk account` and `Helpdesk` to match the new `Launchpit Agency` UI text.

### 2.2 AI Prompts & Outbound Emails
We will update automatic system messages and AI prompts:
1. **`server/src/routes/workspaces.ts`**:
   - Change invitation and welcome email sign-offs from `— Helpdesk Team` to `— Launchpit Agency Team`.
   - Change welcome text `Log in to Helpdesk to get started.` to `Log in to Launchpit Agency to get started.`.
2. **`server/src/routes/tasks.ts`**:
   - Change task assignment notifications from `— Helpdesk Team` to `— Launchpit Agency Team`.
3. **`server/src/lib/resolve-linked-ticket.ts`**:
   - Change ticket resolution reply/emails from `— Helpdesk Team` to `— Launchpit Agency Team`.
4. **`server/src/routes/replies.ts`**:
   - Update system prompt: Change `"You are a helpful customer support assistant for Code with Mosh. "` to `"You are a helpful customer support assistant for Launchpit Agency. "`.
   - Update link: Change `https://codewithmosh.com` to `https://launchpit.agency`.
5. **`server/src/lib/auto-resolve-ticket.ts`**:
   - Update system prompt: Change `"You are a friendly and professional support agent for Code with Mosh. "` to `"You are a friendly and professional support agent for Launchpit Agency. "`.
   - Change sign-off text from `Code with Mosh Support` to `Launchpit Agency Support`.

### 2.3 Knowledge Base & Documentation
We will update branding in markdown files:
1. **`server/knowledge-base.md`**:
   - Change `# Code with Mosh -- Support Knowledge Base` to `# Launchpit Agency -- Support Knowledge Base`.
   - Change `guides for Code with Mosh courses.` to `guides for Launchpit Agency services and platform.`.
2. **`DESIGN.md`**:
   - Change project name references from `Helpdesk` to `Launchpit Agency`.
3. **`README.md`**:
   - Change title from `# Helpdesk` to `# Launchpit Agency`.
   - Update course reference/branding notes to reflect `Launchpit Agency`.
4. **`unified_prd.md` & `project2/prd.md`**:
   - Update high-level descriptions to reference `Launchpit Agency` support.

---

## 3. Verification Plan
After making the branding replacements, we will run the following verification steps:
1. Compile client and server to verify there are no TypeScript or compilation errors.
2. Run end-to-end tests to make sure user authentication, kanban columns, and layouts pass using the updated Playwright assertions.
