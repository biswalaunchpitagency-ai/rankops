# Concurrent Development Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a single command at the root of the project to concurrently run both the server and client development servers, displaying combined, labeled, and colored logs.

**Architecture:** Use the `concurrently` package to run both workspaces (`server` and `client`) in parallel from the root directory with clean prefixes and auto-shutdown options.

**Tech Stack:** Bun, npm/Node, concurrently

## Global Constraints
- Do not use yarn or pnpm. Use Bun as the primary runtime/package manager in the project, but ensure compatibility with npm scripts since the user requested running it via npm package/scripts.

---

### Task 1: Install Concurrently and Add Dev Script

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: None
- Produces: `dev` script in root `package.json` to start client and server concurrently.

- [ ] **Step 1: Install `concurrently` as a devDependency in the root**

  Run the command at the root of the workspace:
  ```bash
  bun add -d concurrently
  ```
  Expected output: The dependency is added to root `package.json`'s `devDependencies` list, and `bun.lock` is updated.

- [ ] **Step 2: Add `"dev"` script to root `package.json`**

  In `package.json`, locate the `"scripts"` block and add:
  ```json
  "dev": "concurrently --kill-others -n \"server,client\" -c \"blue.bold,magenta.bold\" \"bun --cwd server dev\" \"bun --cwd client dev\""
  ```
  
  So that the `"scripts"` section in `package.json` looks like this:
  ```json
  "scripts": {
    "dev": "concurrently --kill-others -n \"server,client\" -c \"blue.bold,magenta.bold\" \"bun --cwd server dev\" \"bun --cwd client dev\"",
    "db:reset": "tsx server/prisma/reset-db.ts",
    "db:push": "prisma db push --schema=server/prisma/schema.prisma --accept-data-loss",
    "db:generate": "prisma generate --schema=server/prisma/schema.prisma",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
  ```

- [ ] **Step 3: Verify the execution of the `dev` script**

  Run the script from the root using:
  ```bash
  bun run dev
  ```
  Or using npm:
  ```bash
  npm run dev
  ```
  Expected output: The terminal displays labeled output like:
  ```
  [server] tsx watch src/index.ts
  [client] vite
  ```
  Verify that both processes boot up successfully. Then terminate the process with `Ctrl+C` and ensure both client and server processes shut down cleanly.

- [ ] **Step 4: Commit the changes**

  Run:
  ```bash
  git add package.json bun.lock
  git commit -m "chore: add concurrently and dev script to run server and client"
  ```
