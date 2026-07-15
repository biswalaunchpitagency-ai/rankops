# Rebranding Helpdesk to Launchpit Agency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the client-facing and AI-agent-facing components of the Helpdesk application to Launchpit Agency.

**Architecture:** We will replace all occurrences of user-visible "Helpdesk", "Helpdesk Team", "Code with Mosh", and their corresponding support links in UI, prompts, email jobs, tests, and documentation, while leaving the database connection schema, lockfiles, and package scripts unchanged.

**Tech Stack:** React, TypeScript, Express, Playwright, Vitest, OpenAI AI SDK.

## Global Constraints
- Do not edit or rename the database connection string schema, database name, lockfile items, package name dependencies, or theme keys.
- Do not introduce placeholders, "TODO"s, or incomplete configurations.
- Ensure all tests continue to pass after replacement.

---

### Task 1: Client Rebranding & End-to-End Tests

**Files:**
- Modify: `client/index.html:10`
- Modify: `client/src/components/Layout.tsx:81`
- Modify: `client/src/pages/LoginPage.tsx:78`
- Modify: `e2e/tests/auth.spec.ts:20,440`
- Modify: `e2e/fixtures/auth.ts:54`

**Interfaces:**
- Consumes: None
- Produces: Updated user interface and end-to-end tests matching the "Launchpit Agency" name.

- [ ] **Step 1: Modify client index HTML**
  Replace `<title>Helpdesk</title>` with `<title>Launchpit Agency</title>`.
  ```html
  <<<<
      <title>Helpdesk</title>
  ====
      <title>Launchpit Agency</title>
  >>>>
  ```

- [ ] **Step 2: Modify client Layout sidebar header**
  Replace sidebar branding label `Helpdesk` with `Launchpit Agency`.
  ```tsx
  <<<<
              <span className="text-[14px] font-semibold tracking-tight text-foreground transition-colors">
                Helpdesk
              </span>
  ====
              <span className="text-[14px] font-semibold tracking-tight text-foreground transition-colors">
                Launchpit Agency
              </span>
  >>>>
  ```

- [ ] **Step 3: Modify client LoginPage welcome message**
  Replace login prompt text `"Sign in to your helpdesk account"` with `"Sign in to your Launchpit Agency account"`.
  ```tsx
  <<<<
            <p className="text-muted-foreground text-[13px] mt-1.5">
              Sign in to your helpdesk account
            </p>
  ====
            <p className="text-muted-foreground text-[13px] mt-1.5">
              Sign in to your Launchpit Agency account
            </p>
  >>>>
  ```

- [ ] **Step 4: Update Playwright Auth Fixture**
  Update the fixture expected text in `e2e/fixtures/auth.ts` to expect `/sign in to your launchpit agency account/i`.
  ```typescript
  <<<<
    await expect(page.getByText(/sign in to your helpdesk account/i)).toBeVisible();
  ====
    await expect(page.getByText(/sign in to your launchpit agency account/i)).toBeVisible();
  >>>>
  ```

- [ ] **Step 5: Update Playwright Auth Tests**
  Update the auth spec tests in `e2e/tests/auth.spec.ts` to expect `Launchpit Agency` branding.
  ```typescript
  <<<<
        await expect(page.getByText(/sign in to your helpdesk account/i)).toBeVisible();
  ====
        await expect(page.getByText(/sign in to your launchpit agency account/i)).toBeVisible();
  >>>>
  ```
  And also:
  ```typescript
  <<<<
      test("should display Helpdesk branding", async ({ page }) => {
        await expect(page.getByText("Helpdesk").first()).toBeVisible();
      });
  ====
      test("should display Helpdesk branding", async ({ page }) => {
        await expect(page.getByText("Launchpit Agency").first()).toBeVisible();
      });
  >>>>
  ```

- [ ] **Step 6: Run build validation**
  Run `npm run build` in the client directory to ensure there are no compilation errors.
  Expected: Successful production build.

- [ ] **Step 7: Commit Changes**
  ```bash
  git add client/index.html client/src/components/Layout.tsx client/src/pages/LoginPage.tsx e2e/tests/auth.spec.ts e2e/fixtures/auth.ts
  git commit -m "feat: rebrand UI and authentication tests to Launchpit Agency"
  ```

---

### Task 2: Email Sign-off Rebranding

**Files:**
- Modify: `server/src/routes/workspaces.ts:49,168-169`
- Modify: `server/src/routes/tasks.ts:94,148`
- Modify: `server/src/lib/resolve-linked-ticket.ts:46,59`

**Interfaces:**
- Consumes: None
- Produces: Outbound system-generated emails signed off with "Launchpit Agency" or "Launchpit Agency Team".

- [ ] **Step 1: Rebrand Workspace notification email templates**
  Update `server/src/routes/workspaces.ts` to sign off emails with `Launchpit Agency` and refer to the application name.
  ```typescript
  <<<<
        `You can now create boards, invite teammates, and start managing tasks.\n\n` +
        `— Helpdesk Team`,
  ====
        `You can now create boards, invite teammates, and start managing tasks.\n\n` +
        `— Launchpit Agency Team`,
  >>>>
  ```
  And:
  ```typescript
  <<<<
        `Log in to Helpdesk to get started.\n\n` +
        `— Helpdesk Team`,
  ====
        `Log in to Launchpit Agency to get started.\n\n` +
        `— Launchpit Agency Team`,
  >>>>
  ```

- [ ] **Step 2: Rebrand Task notification email templates**
  Update `server/src/routes/tasks.ts` to sign off with `Launchpit Agency Team`.
  ```typescript
  <<<<
          `Priority: ${task.priority.replace("_", " ")}\n` +
          `— Helpdesk Team`,
  ====
          `Priority: ${task.priority.replace("_", " ")}\n` +
          `— Launchpit Agency Team`,
  >>>>
  ```
  And:
  ```typescript
  <<<<
          `Priority: ${updated.priority.replace("_", " ")}\n` +
          `— Helpdesk Team`,
  ====
          `Priority: ${updated.priority.replace("_", " ")}\n` +
          `— Launchpit Agency Team`,
  >>>>
  ```

- [ ] **Step 3: Rebrand Ticket resolution email templates**
  Update `server/src/lib/resolve-linked-ticket.ts` to sign off with `Launchpit Agency Team`.
  ```typescript
  <<<<
              `If you have any further questions, feel free to reply to this email.\n\n` +
              `— Helpdesk Team`,
  ====
              `If you have any further questions, feel free to reply to this email.\n\n` +
              `— Launchpit Agency Team`,
  >>>>
  ```
  And:
  ```typescript
  <<<<
            `If you have any further questions, feel free to reply.\n\n` +
            `— Helpdesk Team`,
  ====
            `If you have any further questions, feel free to reply.\n\n` +
            `— Launchpit Agency Team`,
  >>>>
  ```

- [ ] **Step 4: Commit Changes**
  ```bash
  git add server/src/routes/workspaces.ts server/src/routes/tasks.ts server/src/lib/resolve-linked-ticket.ts
  git commit -m "feat: update system email sign-offs to Launchpit Agency Team"
  ```

---

### Task 3: AI Assistant Prompt Rebranding

**Files:**
- Modify: `server/src/routes/replies.ts:152,200`
- Modify: `server/src/lib/auto-resolve-ticket.ts:46,56`

**Interfaces:**
- Consumes: OpenAI/Gemini/NVIDIA AI SDK integration
- Produces: Rebranded system prompt rules for the automated AI ticket helper.

- [ ] **Step 1: Modify AI Reply Prompt**
  Update `server/src/routes/replies.ts` system prompt to represent Launchpit Agency and use `https://launchpit.agency` on sign-off.
  ```typescript
  <<<<
      system:
        "You are a helpful customer support assistant for Code with Mosh. " +
  ====
      system:
        "You are a helpful customer support assistant for Launchpit Agency. " +
  >>>>
  ```
  And:
  ```typescript
  <<<<
        `End the reply with a sign-off using the agent's name: ${agentName}, and include the link https://codewithmosh.com on its own line after the sign-off.`,
  ====
        `End the reply with a sign-off using the agent's name: ${agentName}, and include the link https://launchpit.agency on its own line after the sign-off.`,
  >>>>
  ```

- [ ] **Step 2: Modify Auto-Resolve Ticket Prompt**
  Update `server/src/lib/auto-resolve-ticket.ts` to identify as Launchpit Agency and sign off using Launchpit Agency Support.
  ```typescript
  <<<<
          system:
            "You are a friendly and professional support agent for Code with Mosh. " +
  ====
          system:
            "You are a friendly and professional support agent for Launchpit Agency. " +
  >>>>
  ```
  And:
  ```typescript
  <<<<
            "- Sign off with:\n\nBest regards,\\nCode with Mosh Support\\n\\n" +
  ====
            "- Sign off with:\n\nBest regards,\\nLaunchpit Agency Support\\n\\n" +
  >>>>
  ```

- [ ] **Step 3: Commit Changes**
  ```bash
  git add server/src/routes/replies.ts server/src/lib/auto-resolve-ticket.ts
  git commit -m "feat: rebrand AI prompts and sign-offs to Launchpit Agency"
  ```

---

### Task 4: Knowledge Base & Documentation Rebranding

**Files:**
- Modify: `server/knowledge-base.md:1,6`
- Modify: `DESIGN.md:2,77,83,93`
- Modify: `README.md:1,3`
- Modify: `unified_prd.md:3,18,36,55,58,78,134,215,234`
- Modify: `project2/prd.md:1,3,28,220`

**Interfaces:**
- Consumes: None
- Produces: Updated markdown documentation and product requirements referring to Launchpit Agency.

- [ ] **Step 1: Rebrand Support Knowledge Base**
  Update `server/knowledge-base.md` to reference Launchpit Agency.
  ```markdown
  <<<<
  # Code with Mosh -- Support Knowledge Base

  *Last Updated: 2026*

  This document contains official support policies and troubleshooting
  guides for Code with Mosh courses.
  ====
  # Launchpit Agency -- Support Knowledge Base

  *Last Updated: 2026*

  This document contains official support policies and troubleshooting
  guides for Launchpit Agency services and platform.
  >>>>
  ```

- [ ] **Step 2: Rebrand Design System and Readme**
  Update project branding headers in `DESIGN.md` and `README.md` to reference Launchpit Agency.
  - In `README.md`, change `# Helpdesk` to `# Launchpit Agency`.
  - In `README.md`, replace references to "Claude Code course" or custom templates to Launchpit Agency.
  - In `DESIGN.md`, change `name: Helpdesk` and `# Design System: Helpdesk` to `name: Launchpit Agency` and `# Design System: Launchpit Agency`.

- [ ] **Step 3: Rebrand Product Requirement Documents**
  Update `unified_prd.md` and `project2/prd.md` to refer to Launchpit Agency platform/support instead of generic "Helpdesk" or course notes where applicable.

- [ ] **Step 4: Commit Changes**
  ```bash
  git add server/knowledge-base.md DESIGN.md README.md unified_prd.md project2/prd.md
  git commit -m "docs: rebrand all documentation and PRDs to Launchpit Agency"
  ```
