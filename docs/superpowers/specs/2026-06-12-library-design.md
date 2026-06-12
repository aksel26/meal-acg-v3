# Library Feature Design

## Summary

Build a dedicated library rental feature for the admin and user apps. The feature manages company books, one active borrower per book, admin approval, user return requests, and admin-confirmed returns.

This design follows the existing `meal-acg-v3` patterns used by vehicle applications and locker requests, but keeps the book domain separate so rental rules do not leak into facilities or asset-register code.

## Goals

- Admin users can create, read, update, and delete books.
- Admin users can set whether a book is rentable.
- Admin users can set a global default rental period and a per-book rental period override.
- Admin users can view current borrower information, rental status, remaining days, overdue days, rental date, approval date, due date, and returned date.
- Admin users can approve or reject rental applications.
- Admin users can confirm returns after users request return reception.
- User app users can see all books and their current rental availability.
- User app users can request a rentable book with one click.
- User app users can request return for an approved rental; the rental then enters P&C reception.
- User app users can see the current borrower for rented books: name, team, rental status, and due date.

## Non-Goals

- Reservation queues or waitlists.
- Multiple inventory copies for one book record.
- Cover images, ISBN, purchase metadata, storage location, tags, or advanced catalog metadata.
- Notifications.
- Rental extension.
- Advanced search or filtering.
- Per-user maximum rental count.

## Data Model

### `books`

Stores the book master record.

Fields:

- `id uuid primary key`
- `title text not null`
- `author text`
- `memo text`
- `status text not null default 'available'`
- `rental_period_days_override integer`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Allowed book statuses:

- `available`: book may be rented if it has no active rental.
- `disabled`: admin has disabled rental for the book.

The book table does not store `in_use`. Current rental state is derived from active `book_rentals` rows so it cannot drift from the rental history.

### `library_settings`

Stores global library settings. Start with a single row.

Fields:

- `id text primary key default 'default'`
- `default_rental_period_days integer not null default 14`
- `updated_at timestamptz not null default now()`

### `book_rentals`

Stores rental requests and lifecycle history.

Fields:

- `id uuid primary key`
- `book_id uuid not null references books(id)`
- `requester_id uuid not null references members(id)`
- `status text not null default 'pending'`
- `requested_at timestamptz not null default now()`
- `approved_at timestamptz`
- `rented_at timestamptz`
- `due_at timestamptz`
- `return_requested_at timestamptz`
- `returned_at timestamptz`
- `processed_by uuid references members(id)`
- `reject_reason text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Allowed rental statuses:

- `pending`: user requested rental and admin has not processed it.
- `approved`: admin approved the rental; the book is considered rented.
- `rejected`: admin rejected the request.
- `return_requested`: user clicked return; UI displays this as `P&C 접수중`.
- `returned`: admin confirmed physical return.

An active rental is any row for a book with status `approved` or `return_requested` and `returned_at is null`.

The database should prevent more than one active rental per book with a partial unique index over active statuses.

The database should also prevent duplicate pending requests for the same requester and book.

## Rental Rules

- One book record can be rented by only one person at a time.
- A user may rent multiple different books at the same time.
- Users can request rental only when:
  - the book status is `available`,
  - the book has no active rental,
  - the user does not already have a pending request for the same book.
- Admin approval records:
  - `status = 'approved'`
  - `approved_at = now()`
  - `rented_at = now()`
  - `due_at = approved_at + rentalPeriodDays`
  - `processed_by = current admin member id`
- Rental period days come from `books.rental_period_days_override` when present, otherwise `library_settings.default_rental_period_days`.
- Rejection requires `reject_reason`.
- User return changes `approved` to `return_requested` and records `return_requested_at`.
- Admin return confirmation changes `return_requested` to `returned` and records `returned_at`.
- Remaining days and overdue days are derived from `due_at`:
  - if today is before or equal to due date, show remaining days.
  - if today is after due date and the book is not returned, show overdue days.
  - returned rentals show the final returned date and no active remaining/overdue count.

## Admin App

Add admin route `/library`.

Add sidebar item `도서 관리` near the existing facilities and asset items: personal lockers, asset register, and company vehicles.

Use new permissions:

- `library:read`
- `library:write`

Add these permissions to admin RBAC metadata under the `자산/시설` group and include them in default role policies following the same shape as `locker:*` and `vehicle:*`.

### Admin Page Areas

The page contains three practical areas:

- Book management: list books and create, edit, delete records.
- Library settings: edit global default rental period days.
- Rental management: list requests and active rentals, with status actions.

### Admin Book Management

Fields:

- title
- author
- memo
- status
- rental period override

Book deletion should be blocked if the book has rental history. If history exists, admin should disable the book instead.

### Admin Rental Management

Admin can:

- approve pending rental requests,
- reject pending rental requests with a required reason,
- view active borrower name and team,
- view status, rental date, approval date, due date, returned date,
- view remaining days and overdue days,
- confirm a `P&C 접수중` return.

Approval must check active-rental conflicts on the server even if the UI already shows the book as unavailable.

## User App

Add user route `/library`.

Add sidebar item `도서관` near the existing personal locker, asset register, and company vehicle items.

The user page shows all books, not only rentable books.

### User Book List

Each book row or card shows:

- title
- author
- memo
- availability label: `대여 가능`, `대여중`, or `대여중지`
- current borrower name and team when rented
- current rental status
- due date when rented

Only `대여 가능` books enable the `대여 신청하기` button.

### User Rental Flow

The user clicks `대여 신청하기`; no additional form fields are required. The server uses the authenticated user as the requester.

The user can view their own rental history with:

- pending requests,
- approved rentals,
- rejected requests,
- `P&C 접수중` return requests,
- returned rentals.

For an approved, unreturned rental, show `반납하기`. Clicking it changes the row to `return_requested`; admin must confirm final return.

## API Shape

Admin API:

- `GET /api/library`: overview containing books, settings, and rentals.
- `POST /api/library/books`: create book.
- `PATCH /api/library/books/[id]`: update book.
- `DELETE /api/library/books/[id]`: delete book only when no rental history exists.
- `PATCH /api/library/settings`: update default rental period.
- `PATCH /api/library/rentals/[id]`: approve or reject a pending rental.
- `PATCH /api/library/rentals/[id]/return`: confirm return.

User API:

- `GET /api/library`: user overview containing all books, visible active borrower summaries, and my rentals.
- `POST /api/library/rentals`: create rental request.
- `PATCH /api/library/rentals/[id]/return`: request return reception.

All admin write APIs require `library:write`. Admin reads require `library:read`. User APIs require `requireAuth()`.

## UI Patterns

Admin UI should follow the existing admin page style used by vehicles and lockers:

- single route page with a server-loaded initial overview,
- client component for local dialogs and actions,
- toasts for success and failure,
- explicit status badges,
- compact tables or cards rather than a marketing layout.

User UI should follow existing user facility pages:

- clean list/card layout,
- mobile-friendly spacing,
- disabled buttons for unavailable actions,
- rental history in a secondary panel or section.

## Error Handling

Server APIs return JSON `{ error }` for validation, auth, and conflict failures.

Expected conflict cases:

- book is disabled,
- book already has an active rental,
- user already has a pending request for the same book,
- approving a request would conflict with an active rental,
- rejecting without a reason,
- requesting return for a rental that is not approved,
- confirming return for a rental that is not in P&C reception,
- deleting a book with rental history.

Clients should read error JSON defensively with a fallback message, following the safer patterns used by locker hooks.

## Verification

Implementation should run at least:

- `pnpm --filter admin check-types`
- `pnpm --filter user check-types`

If practical, also run targeted admin and user builds. If existing baseline typecheck debt appears outside the touched scope, document it clearly instead of treating it as proof that the library change failed.

Review the migration manually for:

- partial unique index on active rentals,
- status check constraints,
- updated-at triggers,
- RBAC seed updates for `library:*`,
- no secret or environment variable changes.
