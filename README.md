# Auth

**Centralized Authentication & Identity Server for the Wikramawardana Ecosystem**

> A full-featured SSO/OIDC provider that serves as the single source of truth for user identity, sessions, and access control across all connected applications.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

<!-- Add screenshot here -->

---

## Overview

Auth is the central identity provider powering all applications in this ecosystem. Built on [better-auth](https://www.better-auth.com/) with OIDC provider capabilities, it handles user registration, login, session management, OAuth2 client management, and consent flows -- so downstream apps never need to implement their own auth logic.

## Features

- **Single Sign-On (SSO)** -- One login for all connected applications via OpenID Connect
- **OIDC Provider** -- Full OAuth2/OIDC compliant authorization server with consent screen
- **User Management Dashboard** -- Admin panel to view, manage, and assign roles to users
- **Session Management** -- View and revoke active sessions across all clients
- **OAuth2 Client Management** -- Register, configure, and manage client applications via UI or env vars
- **Google OAuth Integration** -- Social login with Google as an identity provider
- **Role-Based Access Control** -- Define and assign granular roles per client application
- **Trusted Client Configuration** -- Pre-register clients via environment variables to skip consent
- **Multi-Stage Docker Build** -- Optimized production image with standalone output

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Radix UI |
| Auth Engine | better-auth (admin, jwt, oidcProvider plugins) |
| Database | PostgreSQL with pg pool |
| Runtime | Node.js 22 |
| Deployment | Docker (multi-stage build) |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL 15+

### Installation

```bash
git clone https://github.com/wikramawardana/auth.git
cd auth
pnpm install
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3001

# BetterAuth
BETTER_AUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/auth

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Allowed Origins (comma-separated, for CORS/trusted origins from client apps)
ALLOWED_ORIGINS=http://localhost:3000

# Trusted Clients (JSON array) - for pre-registered clients that skip consent
TRUSTED_CLIENTS='[{"clientId":"my-app","clientSecret":"secret","name":"My App","redirectUrls":["http://localhost:3000/api/auth/callback/auth"]}]'
```

### Database Setup

```bash
# Run better-auth migrations
pnpm db:migrate

# Run application-specific migrations (roles, etc.)
pnpm db:migrate:app
```

### Development

```bash
pnpm dev
```

The server starts at `http://localhost:3001`.

## Production Deployment

Production image tags use the short git SHA. After you push to `main`, GitHub
Actions builds and pushes `ghcr.io/wikramawardana/auth:<short-sha>`.

Auth currently needs a manual GitOps bump after the image build succeeds:

`wikra-gitops/manifests/auth/overlays/prod/kustomization.yaml`

Normal flow:

1. Edit this repo.
2. Commit and push to `main`.
3. Wait for the GitHub Actions build to succeed.
4. Update the GitOps `newTag` to this repo's 7-character commit SHA.
5. Commit and push the GitOps change.
6. Wait for Argo CD to show `auth` as `Synced` and `Healthy`.

## Docker Deployment

### Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://auth.yourdomain.com \
  -t auth .
```

### Run

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/auth \
  -e BETTER_AUTH_SECRET=your-production-secret \
  -e GOOGLE_CLIENT_ID=your-id \
  -e GOOGLE_CLIENT_SECRET=your-secret \
  -e ALLOWED_ORIGINS=https://app1.yourdomain.com,https://app2.yourdomain.com \
  auth
```

### Docker Compose

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── admin/          # Admin APIs (client roles, user roles)
│   │   └── auth/           # better-auth routes, OAuth2 clients, sessions
│   ├── consent/            # OIDC consent screen
│   ├── dashboard/          # Admin dashboard (users, sessions, clients)
│   └── login/              # Login page
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   └── ui/                 # Shared UI primitives (Radix-based)
├── lib/
│   ├── auth.ts             # better-auth server configuration
│   ├── auth-server.ts      # Server-side auth utilities
│   ├── auth-client.ts      # Client-side auth utilities
│   └── app-roles.ts        # Role management logic
└── middleware.ts           # Auth guard middleware
```

**Key Patterns:**
- Middleware-based route protection with redirect to login
- PostgreSQL direct queries via `pg` pool (no ORM)
- Database migrations managed via scripts and better-auth CLI
- Standalone Next.js output for minimal Docker images

## Ecosystem

This server is the central identity provider for the following applications:

| Application | Description | Repository |
|-------------|-------------|------------|
| **Expense Tracker** | Personal finance & spending analytics | [wikramawardana/expense-tracker-fe](https://github.com/wikramawardana/expense-tracker-fe) |
| **Dapur Bu Wikra** | Restaurant order management system | [wikramawardana/dapur-buwikra-fe](https://github.com/wikramawardana/dapur-buwikra-fe) |
| **Starport** | Docker container management dashboard | [wikramawardana/starport](https://github.com/wikramawardana/starport) |
| **Roamly** | Travel trip planner | [wikramawardana/roamly](https://github.com/wikramawardana/roamly) |

Each application authenticates users through this server using the OIDC protocol. Register clients via the dashboard or `TRUSTED_CLIENTS` env var.

## License

[MIT](LICENSE)
