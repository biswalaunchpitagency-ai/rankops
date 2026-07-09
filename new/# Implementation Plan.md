# Implementation Plan



## Phase 1: Project Setup



- [ ] Initialize monorepo structure (`/client`, `/server`)

- [ ] Set up Express server with TypeScript

- [ ] Set up React app with TypeScript

- [ ] Set up PostgreSQL database



## Phase 2: Authentication



- [ ] Create login page

- [ ] Implement login API endpoint

- [ ] Implement session-based authentication middleware

- [ ] Implement logout API endpoint

- [ ] Add route protection on the frontend (redirect to login if unauthenticated)



## Phase 3: User Management



- [ ] Create user management page (admin only)

- [ ] Implement create agent API endpoint

- [ ] Implement list users API endpoint

- [ ] Implement edit user API endpoint

- [ ] Implement delete user API endpoint

- [ ] Add role-based access control (admin vs agent)



## Phase 4: Ticket CRUD



- [ ] Implement create ticket API endpoint

- [ ] Implement list tickets API endpoint (with filtering by status and category, sorting)

- [ ] Implement get ticket API endpoint

- [ ] Implement update ticket API endpoint (change status, assign agent)

- [ ] Create ticket list page with filtering and sorting

- [ ] Create ticket detail page



## Phase 5: AI Features



- [ ] Set up Claude API integration

- [ ] Implement auto-classification endpoint (categorize incoming tickets)

- [ ] Implement AI summary endpoint (generate ticket summary)

<!-- - [ ] Implement AI suggested reply endpoint -->

- [ ] Build knowledge base structure and seed with initial content

- [ ] Integrate AI features into ticket detail page UI



## Phase 6: Email Integration



- [ ] Set up email provider (SendGrid/Mailgun)

- [ ] Implement inbound email webhook to create tickets

- [ ] Implement outbound email sending when an agent replies

- [ ] Handle email threading (replies linked to existing tickets)



## Phase 7: Dashboard



- [ ] Create dashboard page with ticket overview stats (open, resolved, closed counts)

- [ ] Add tickets by category breakdown

- [ ] Add recent tickets list

- [ ] Add quick filters to navigate to filtered ticket list



## Phase 8: Polish & Deployment



- [ ] Add input validation and error handling across all endpoints

- [ ] Add loading states and error states on the frontend

- [ ] Write Dockerfile for server and client

- [ ] Set up Docker Compose for local development

- [ ] Write deployment configuration

# AI-Powered Ticket Management System



## Problem



We receive hundreds of support emails daily. Our agents manually read, classify, and respond to each ticket — which is slow and leads to impersonal, canned responses.



## Solution



Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets — delivering faster, more personalized responses to students while freeing up agents for complex issues.



## Features



- Receive support emails and create tickets

- Auto-generate human-friendly responses using a knowledge base

- Ticket list with filtering and sorting

- Ticket detail view

- AI-powered ticket classification 

- AI summaries

- AI-suggested replies

- User management (admin only)

- Dashboard to view and manage all tickets



## Ticket Statuses



- Open

- Resolved

- Closed



## Ticket Categories



- General Question

- Technical Question

- Refund Request



## User Roles



- **Admin**: Deployed with the system. Can create and manage agents.

- **Agent**: Created by admin. Can view and manage tickets.

# Helpdesk



> This project is built as part of my [Claude Code](https://codewithmosh.com/p/claude-code) course, showing how to build and ship a production-ready full-stack app with AI-assisted development.



An AI-powered ticket management system that automatically classifies, responds to, and routes support tickets.



## Features



- Receive support emails and create tickets via SendGrid inbound parse

- AI-powered ticket classification (General Question, Technical Question, Refund Request)

- AI-suggested replies and summaries

- Ticket list with filtering and sorting

- Ticket detail view with reply thread

- User management (admin only)

- Dashboard with stats



## Tech Stack



- **Frontend**: React, TypeScript, Vite, shadcn/ui, TanStack Query

- **Backend**: Express 5, TypeScript, Bun

- **Database**: PostgreSQL, Prisma ORM

- **AI**: OpenAI GPT via Vercel AI SDK

- **Auth**: Better Auth (email/password, database sessions)

- **Job Queue**: pg-boss

- **Error Tracking**: Sentry

- **Email**: SendGrid (inbound + outbound)



## Project Structure



```

client/   - React frontend (Vite)

server/   - Express backend

core/     - Shared code (Zod schemas, types, constants)

e2e/      - Playwright E2E tests

```



## Prerequisites



- [Bun](https://bun.sh) (runtime and package manager)

- PostgreSQL



## Getting Started



1. **Install dependencies**



   ```bash

   bun install

   ```



2. **Set up environment variables**



   ```bash

   cp server/.env.example server/.env

   cp client/.env.example client/.env

   ```



   Edit `server/.env` and fill in the required values. At minimum:

   - `DATABASE_URL` - PostgreSQL connection string

   - `BETTER_AUTH_SECRET` - generate with `openssl rand -base64 32`

   - `OPENAI_API_KEY` - for AI features



3. **Set up the database**



   ```bash

   cd server

   bunx prisma migrate dev

   bunx prisma db seed

   ```



4. **Start the dev servers**



   ```bash

   # Terminal 1 - backend

   cd server && bun run dev



   # Terminal 2 - frontend

   cd client && bun run dev

   ```



   The client runs on `http://localhost:5173` and proxies API requests to the server on port 3000.



## Testing



```bash

# Component tests

cd client && bun run test



# E2E tests (requires both servers running)

bun run test:e2e

```



## Deployment (Railway)



The app is configured for single-service deployment on Railway. The Express server serves the built React client as static files in production.



1. **Build the Docker image**



   ```bash

   docker build -t helpdesk .

   ```



2. **Run locally with Docker**



   ```bash

   docker run -p 3000:3000 --env-file server/.env -e NODE_ENV=production helpdesk

   ```



3. **Deploy to Railway**



   - Create a new project and link this repo

   - Add a PostgreSQL database

   - Set the required environment variables (see `server/.env.example`)

   - After the first deploy, seed the database:

     ```bash

     railway run -- bun run --cwd server prisma db seed

     ```



### Required Environment Variables (Production)



| Variable | Description |

|----------|-------------|

| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Railway) |

| `BETTER_AUTH_SECRET` | Auth secret key |

| `BETTER_AUTH_URL` | App URL (e.g. `https://yourapp.up.railway.app`) |

| `TRUSTED_ORIGINS` | Same as `BETTER_AUTH_URL` |

| `WEBHOOK_SECRET` | For inbound email webhook verification |

| `OPENAI_API_KEY` | OpenAI API key for AI features |

| `SENDGRID_API_KEY` | SendGrid API key for outbound email |

| `SENDGRID_FROM_EMAIL` | Verified sender email address |

| `SEED_ADMIN_EMAIL` | Initial admin user email |

| `SEED_ADMIN_PASSWORD` | Initial admin user password |



Optional: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`

this is the .md filles of the helpdesk  project so i just want to add the features to this 