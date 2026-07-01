# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start server + client concurrently (requires Node >= 20.19)
npm run dev:server   # server only (tsx watch)
npm run dev:client   # client only (vite)
npm run build        # compile client to client/dist, compile server to server/dist
npm start            # run compiled server (after build)
npm run typecheck    # type-check both client and server without emitting
```

There is no test suite and no linter configured.

> **Note:** Never run `npm install` with `sudo` — it sets `node_modules` ownership to root, causing Vite permission errors at runtime. Fix with `sudo chown -R $(whoami) node_modules`.

## Architecture

This is a monorepo with two TypeScript projects sharing no build tooling between them:

- **`server/`** — Express API, compiled with `tsc`, run in dev with `tsx watch`
- **`client/`** — React 19 SPA, built with Vite 7, served in prod as static files from `client/dist`

In production (`npm start`), the Express server serves the compiled client static files and also handles all API routes — there is no separate client server.

### Server layer (`server/src/`)

Three files with strict separation of concerns:

| File | Role |
|------|------|
| `domain.ts` | Pure TypeScript types — `WorkItem`, `Resource`, `Booking`, `AppState`, enums |
| `scheduling.ts` | All business logic and in-memory state — seeding, queries, mutations, slot-finding |
| `index.ts` | Express HTTP layer — route handlers, input parsing/validation, delegates to `scheduling.ts` |

**State is entirely in-memory.** `scheduling.ts` exports a single `state: AppState` object that is seeded with realistic data on startup (8 resources, 20 assigned work items, 40 backlog items). No database, no persistence — all data resets on server restart.

The slot-finding algorithm (`findSlot`) scans a resource's working hours in 15-minute increments looking for the first gap that fits the work item duration without overlapping existing non-canceled bookings.

Booking rules enforced server-side:
- A work item with an existing `bookingId` cannot have its metadata edited ("Booked work items are locked")
- Booking requires a full skill match between resource and work item
- Reassigning moves the booking to a new slot on the new resource

### Client layer (`client/src/`)

The entire UI lives in a single `App.tsx` component (~1,700 lines). It manages all application state with `useState`/`useMemo` hooks — no external state library.

**Data flow:**
1. On mount, `GET /api/bootstrap` fetches the full `AppState` (resources, workItems, bookings, skills) and stores it in `data`
2. The Tasks and Team pages also call paginated endpoints (`/api/work-items`, `/api/resources`) independently; their `useEffect`s re-fetch whenever `data` changes, so after any mutation that calls `load()`, paginated views refresh automatically
3. Mutations call `PATCH`/`POST` endpoints, then call `load()` to refresh `data`

**Routing** is manual: `window.history.pushState` + a `pathname` state variable. Valid paths are `/home`, `/schedule`, `/tasks`, `/team`. No router library.

**`client/src/api.ts`** contains the two paginated fetch helpers (`fetchWorkItems`, `fetchResources`) plus the shared `Page<T>` type used by both client and server (the server's copy is in `scheduling.ts`).

**`client/src/types.ts`** mirrors the server's `domain.ts` types — these are kept in sync manually; there is no shared package between client and server.

### API surface

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bootstrap` | Full app state |
| GET | `/api/work-items` | Paginated, filterable work items |
| GET | `/api/resources` | Paginated, filterable resources |
| GET | `/api/suggestions/:workItemId` | Ranked resource suggestions for a work item |
| POST | `/api/work-items` | Create work item |
| POST | `/api/resources` | Create resource |
| PATCH | `/api/work-items/:id` | Edit metadata or set/clear `assigneeId` (triggers book/reassign/unassign) |
| PATCH | `/api/resources/:id` | Edit resource |
| POST | `/api/bookings` | Book a work item directly |
| PATCH | `/api/bookings/:id` | Update booking status |
