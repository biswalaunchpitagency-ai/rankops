# Design Spec: Concurrent Development Runner

## Goal
Provide a single command (`bun run dev` or `npm run dev`) at the root of the project to concurrently run both the server and client development servers, displaying combined, labeled, and colored logs.

## Proposed Changes

### 1. Installation of `concurrently`
- We will install `concurrently` as a development dependency at the root of the workspace.
- Command: `bun add -d concurrently` (since the workspace uses Bun).

### 2. Update Root `package.json`
Add the `dev` script in the root `package.json`'s `"scripts"` object:
```json
"dev": "concurrently --kill-others -n \"server,client\" -c \"blue.bold,magenta.bold\" \"bun --cwd server dev\" \"bun --cwd client dev\""
```

- `--kill-others`: If either the server or client process exits, this flag automatically kills the other process. This prevents orphaned processes on ports 3000 and 5173.
- `-n "server,client"`: Assigns names to the output streams.
- `-c "blue.bold,magenta.bold"`: Color-codes the prefixes so logs are easy to distinguish visually.
- `bun --cwd server dev`: Runs `bun run dev` inside the `server` workspace directory.
- `bun --cwd client dev`: Runs `bun run dev` inside the `client` workspace directory.

## Success Criteria
1. Running the dev command in the root concurrently runs both servers.
2. The logs are combined, prefixed with `[server]` and `[client]`, and color-coded.
3. Terminating the root process (e.g. via `Ctrl+C`) successfully cleans up both child processes.
