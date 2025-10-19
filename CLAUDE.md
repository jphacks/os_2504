# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MoguMogu** - A group restaurant selection platform where organizers create voting rooms and participants vote on restaurant candidates using a card-based interface.

**Stack:**
- Frontend: Vite + React 19 + Tailwind CSS v4
- Backend: Express (TypeScript) on port 3000
- Database: PostgreSQL (Docker locally, Cloud SQL in production)
- ORM: Drizzle ORM

## Common Commands

### Development
```bash
# Start full development environment (frontend + backend + DB in Docker)
task dev

# Start development in background
task dev:detach

# Local development without Docker (requires separate DB)
pnpm dev                    # Runs Vite (port 5173) + Express (port 3000) concurrently
pnpm dev:web               # Vite only
pnpm dev:server            # Express only
```

### Testing
```bash
# API integration tests (Supertest + Vitest)
task test:api              # Runs tests against Docker PostgreSQL
pnpm test:api              # Runs tests (requires DATABASE_URL env var)

# E2E tests (Playwright)
task test:e2e              # Starts dev environment, installs Playwright, runs tests
pnpm test:e2e              # Runs E2E tests (requires running dev environment)

# Unit tests
pnpm test                  # Vitest unit tests
```

### Linting & Type Checking
```bash
pnpm lint                  # ESLint
pnpm typecheck             # TypeScript type checking
task precheck              # Run lint + typecheck + unit tests (pre-commit validation)
```

### Build & Production
```bash
pnpm build                 # Build frontend (dist/client) + backend (dist/server)
pnpm start                 # Run production build (node dist/server/index.js)
task prod:test             # Build and verify with health check
task ci                    # Full CI pipeline in Docker (lint/typecheck/test/build)
```

### Database
```bash
task db:seed               # Seed sample restaurant data
pnpm db:generate           # Generate Drizzle migrations from schema
pnpm db:migrate            # Apply migrations
pnpm db:studio             # Open Drizzle Studio (DB GUI)
```

### Docker Management
```bash
task docker:up             # Start DB + Adminer only
task docker:down           # Stop containers
task stop                  # Stop dev containers
task clean                 # Stop and remove volumes
task shell                 # Open shell in app container
```

## Architecture

### Application Structure

This is a **restaurant voting platform** with two distinct user flows:

1. **Organizer Flow** (`DashboardView`): Create room → Configure settings → Share URL → Manage members → View ranking
2. **Participant Flow** (`ParticipantView`): Join room → Vote on restaurant cards → View results

### Directory Organization

```
src/                          # Frontend (React)
├── features/
│   ├── dashboard/           # Organizer interface (5 scenes: landing/setup/share/cards/ranking)
│   └── participant/         # Participant voting interface (3 steps: join/voting/finished)
├── lib/
│   ├── api.ts              # Fetch wrapper for API calls
│   ├── types.ts            # Shared TypeScript types
│   └── ui.ts               # Tailwind utility classes
├── hooks/                   # useRoute.ts - Client-side routing (no React Router)
└── utils/                   # session.ts - sessionStorage for auth tokens

server/                      # Backend (Express)
├── index.ts                # Express setup, middleware, static file serving
├── routes/
│   ├── rooms.ts            # Room/member/voting API endpoints
│   └── restaurants.ts      # Restaurant detail APIs
├── store.ts                # Business logic layer (648 lines - all DB queries)
├── db/client.ts            # Drizzle ORM initialization
└── scripts/seed.ts         # Database seeding

db/
├── schema.ts               # Drizzle schema (rooms, members, restaurants, likes, etc.)
└── index.ts                # Database pool configuration

tests/
├── api/                    # Integration tests (Supertest + Vitest)
└── e2e/                    # E2E tests (Playwright)
```

### Key Architectural Patterns

#### 1. Three-Tier Architecture
**Frontend → Express Routes → store.ts → Drizzle ORM → PostgreSQL**

- All business logic lives in `server/store.ts`
- Routes in `server/routes/*.ts` handle validation and call store functions
- Frontend uses `src/lib/api.ts` wrapper for all HTTP calls

#### 2. Client-Side Routing
**Custom routing without React Router** (`src/hooks/useRoute.ts`):
- `/` → DashboardView (Organizer)
- `/r/[roomCode]` → ParticipantView (Voter)
- Uses `window.location.pathname` parsing + `popstate` events

#### 3. Authentication Flow
- **Token-based**: JWT tokens stored in `sessionStorage` (per room)
- **Issue token**: `POST /api/rooms/{roomCode}/members/{memberId}/session`
- **Use token**: `Authorization: Bearer {token}` header for voting APIs
- **Session key**: `mogfinder::session::{roomCode}` in sessionStorage

#### 4. Room State Management
- **Statuses**: `'waiting'` (setup phase) → `'voting'` (active voting)
- **Preparation**: Async simulation with progress tracking (0% → 35% → 70% → 100%)
- **Frontend polling**: DashboardView polls room status every 2 seconds during setup

#### 5. Database Schema Relationships
```
rooms (1) ─→ (1) roomSettings
      (1) ─→ (N) members
      (1) ─→ (N) roomRestaurants ─→ (1) restaurants

(room, member, restaurant) → likes (composite PK: roomId + memberId + placeId)
restaurants (1) ─→ (N) ratings (Google reviews cache)
```

**CASCADE deletes**: When a room is deleted, all related data (members, votes, settings) are automatically deleted.

### Critical Code Locations

#### API Endpoints (`server/routes/rooms.ts`)
- `POST /api/rooms` - Create room (calls `store.createRoom`)
- `GET /api/rooms/:room_code` - Get room info
- `POST /api/rooms/:room_code/members` - Add participant
- `POST /api/rooms/:room_code/members/:member_id/session` - Issue voting token
- `GET /api/rooms/:room_code/restaurants` - Get voting cards (requires `status='voting'`)
- `POST /api/rooms/:room_code/likes` - Submit vote (requires auth)
- `GET /api/rooms/:room_code/ranking` - Get ranked results

#### Business Logic (`server/store.ts`)
**648 lines** - Contains ALL database operations:
- Room: `createRoom`, `getRoomByCode`, `updateRoomSettings`
- Members: `addMember`, `getMember`, `listMembers`
- Restaurants: `ensureRestaurantsPrepared`, `getRestaurantDetail`, `seedSampleRestaurants`
- Voting: `recordLike`, `listLikes`, `resetLikes`, `getRanking`
- Preparation: `schedulePreparation` (simulates async data loading)

#### Frontend State Management
- **DashboardView** (`src/features/dashboard/DashboardView.tsx`): 1118 lines, manages 5 scenes
- **ParticipantView** (`src/features/participant/ParticipantView.tsx`): Manages 3-step voting flow
- **Session persistence**: `src/utils/session.ts` handles token storage/retrieval

### Type Safety

- **Shared types**: `src/lib/types.ts` defines `RoomSummary`, `Member`, `Restaurant`, etc.
- **API validation**: Zod schemas in route files (e.g., `settingsSchema`, `likeSchema`)
- **Database types**: Auto-generated from `db/schema.ts` via Drizzle

### Configuration Files

- **tsconfig.json**: Frontend TypeScript config
- **tsconfig.server.json**: Backend TypeScript config (separate compilation)
- **vite.config.ts**: Vite dev server + proxy `/api` → `http://localhost:3000`
- **drizzle.config.ts**: Database migration config
- **docker-compose.dev.yml**: Docker setup for local development

### Environment Variables

Required for development (see `.env.example`):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app?sslmode=disable
PORT=3000
HOST=0.0.0.0
APP_SHARE_BASE_URL=http://localhost:5173
```

Production-specific:
```
DB_SSL=true
DB_SSL_STRICT=true
DB_MAX_CONNECTIONS=10
CLOUD_SQL_CONNECTION=project:region:instance
```

### Development Workflow

When adding features:

1. **Define types** in `src/lib/types.ts` (if needed)
2. **Update schema** in `db/schema.ts` (if DB changes needed)
3. **Generate migration**: `pnpm db:generate` and `pnpm db:migrate`
4. **Add business logic** to `server/store.ts`
5. **Create API endpoint** in `server/routes/*.ts` with Zod validation
6. **Update frontend** in `src/features/*/` and call via `api()` wrapper
7. **Write tests** in `tests/api/` or `tests/e2e/`

### Testing Strategy

- **API tests** (`tests/api/`): Test business logic + DB interactions using Supertest
- **E2E tests** (`tests/e2e/`): Test complete user flows with Playwright
- Use `task test:api` to run integration tests in Docker environment
- E2E tests expect dev environment running (`task dev:detach` first)

### Deployment

- **Platform**: Google Cloud Run + Cloud SQL
- **CI/CD**: GitHub Actions (on push to `main`)
- **Build**: Docker multi-stage build → Artifact Registry → Cloud Run
- See `docs/Tutorial.md` for detailed deployment setup
