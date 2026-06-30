# Design: Popup add/edit and /home dashboard

## Summary

Two related UX changes to the scheduling app:

1. Replace the standalone `/add` route with popup-based create and edit flows, reusing the existing rail-modal shell. Editing an existing work item or teammate opens the form on top of that item instead of navigating away.
2. Move the landing page off `/schedule` and onto a new `/home` dashboard that summarizes the workspace and offers quick actions.

## Current state

- Routes: `/schedule` (default landing), `/team`, `/tasks`, `/add`.
- `/add` renders `createComposer`, a card with a Work Item / Team tab switcher wrapping two forms (`submitWorkItem`, `submitResource`).
- Edit today: `beginEditWorkItem` / `beginEditResource` load form state, then `navigate('/add')`, pulling the user to a separate page.
- After a submit the app navigates to `/tasks` or `/team` and highlights the new record via `postSubmitReveal`.
- Read-only detail popups (the rail modal) already exist for work items and resources on `/schedule`, `/tasks`, and `/team`.

## Change 1: /add becomes popups

### Triggers

- New work item: contextual button in the `/tasks` header, the `/schedule` Work items header, and `/home` quick actions. Opens a blank work-item form in a popup.
- New team member: contextual button in the `/team` header and `/home` quick actions. Opens a blank resource form in a popup.
- Edit existing: `beginEditWorkItem` / `beginEditResource` no longer navigate. The open detail popup swaps from read-only to the edit form in place, over the item.

### Popup modes

Each popup is single purpose (work item or resource) and has two modes:

- `view`: the existing read-only detail card.
- `edit`: the form. Create is `edit` mode with a blank form and no underlying record.

### Save and cancel

- Edit save: PATCH, then return to the read-only `view` in the same popup with updated values.
- Create save: POST, then close the popup and refresh data on the current page, briefly highlighting the new record (reuse `postSubmitReveal`).
- Cancel: edit returns to `view`; create closes the popup.

### Removals

- `/add` from `validPaths`, `navItems`, routing, and the `pageTitle` branch.
- The `createComposer` Work Item / Team tab switcher and `activeCreatePanel` state.
- The `pathname === '/add'` reset effect and the post-submit `navigate('/add')` calls.

## Change 2: /home dashboard

### Routing

- Add `/home` to `validPaths`.
- `/` and any invalid path redirect to `/home` (was `/schedule`).
- Nav order: Home, Schedule, Team, Tasks.
- `/schedule` is unchanged apart from no longer being the landing route.

### Content

- Hero header consistent with the other pages.
- Stat cards derived from existing `data`: open work items, unassigned, assigned, teammates, and today's bookings.
- Quick-action buttons: New work item, New team member (open the create popups).
- Links into Schedule, Team, and Tasks.

## State model

- Reuse `selectedWorkItemId` / `selectedResourceId` to track which popup is open.
- Reuse `editingWorkItemId` / `editingResourceId` to track `view` vs `edit`.
- Add a lightweight create trigger that opens a blank form with no selected record.
- The work-item form keeps its current fields (title, description, priority, duration, target date, skills). Assignment stays on the schedule board.

## Out of scope

- No backend or API changes. Create and edit continue to use the existing POST and PATCH endpoints.
- No change to the scheduling and assignment board behavior.
