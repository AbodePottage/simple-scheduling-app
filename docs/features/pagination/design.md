# Server-side pagination design

## Goal

Add real server-side pagination to the list views so the client fetches one page at a time instead of loading every record through `/api/bootstrap`. Each list shows a "Showing X-Y of N" helper and a numbered page control (Prev, 1, 2, 3, Next).

## Scope

In scope:

- Tasks backlog (work items) becomes a flat, server-paginated list. The dimension grouping is dropped; filter, sort, and search remain as controls that drive query params.
- Team roster paginates per discipline column (Engineers, Data scientists), each column querying its own page.

Out of scope (keep a full structural fetch):

- Schedule board (grid of every resource and their bookings).
- Drag-and-drop assignment (needs the full resource list and queue).
- Suggestions (ranks against all resources).

These three genuinely need the whole dataset, so the board keeps loading full structural data.

## API

### New list endpoints

`GET /api/work-items`

Query params:

- `page` (default 1, min 1)
- `pageSize` (default 10, min 1, max 100)
- `search` (matches title and description, case-insensitive)
- `status` (`all` | `open` | `assigned`)
- `priority` (`all` | a priority value)
- `skill` (`all` | a skill value)
- `sort` (`priority` | `date` | `name` | `duration`)

`GET /api/resources`

Query params:

- `page` (default 1, min 1)
- `pageSize` (default 8, min 1, max 100)
- `discipline` (`Engineer` | `Data scientist` | `all`)
- `search` (matches name, case-insensitive)

### Response envelope

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

`total` is the count of records matching the current filter and search, computed before slicing the page. This is the single source of truth for the "Showing X-Y of N" text.

### Bootstrap

`GET /api/bootstrap` stays for the Schedule board, drag-and-drop, and suggestions. It can be slimmed in a later phase once the list views no longer depend on it.

## Helper text math

- `from = (page - 1) * pageSize + 1`
- `to = from + items.length - 1`
- Render "Showing {from}-{to} of {total}".
- When `total` is 0, render an empty-state message instead of a range.
- The page control hides when `total <= pageSize`; the count text still renders.

## Client

- `client/src/api.ts`: typed fetch helpers returning the envelope.
- Per-list state: `page`, `pageSize`, `total`, plus the existing filter, sort, and search inputs.
- Refetch the page when any of those change; debounce search input.
- Shared `Pagination` component: Prev, numbered pages, Next, plus the count text.
- After a create or edit, refetch the current page so `total` and the range stay accurate. If a delete empties the last page, clamp `page` down.

## Phasing

1. Server: domain pagination helper, two new endpoints, envelope. Additive; bootstrap untouched.
2. Client: `api.ts`, `Pagination` component, Tasks backlog as a flat paginated list.
3. Team roster per-column pagination.
4. Slim bootstrap once lists are independent of it.
