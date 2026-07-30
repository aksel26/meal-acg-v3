# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-07-30
- Surfaces: `apps/admin`, `apps/careers`, `apps/user` chatbot
- Reference implementation:
  - `apps/admin/app/globals.css`
  - `apps/admin/app/(dashboard)/layout.tsx`
  - `apps/admin/components/Sidebar.tsx`
  - `apps/admin/components/Header.tsx`
  - `apps/admin/components/DashboardContentFrame.tsx`
  - `apps/user/app/api/leave-balances/route.ts`
  - `apps/user/app/(content)/acg-life/data.ts`
  - `apps/user/components/Sidebar.tsx`
  - `apps/user/components/BottomNavigation.tsx`
- Rule: Careers follows the Admin product language. This document records the implemented system; it is not a separate visual concept.

## Brand

- Calm, precise, trustworthy internal operations software.
- Monochrome surfaces and restrained semantic color keep attention on work state.
- Use the existing ACG identity and Pretendard typography.
- Avoid gradients, glass effects, decorative shadows, illustrations, and a new accent color.

## Goals

- Make Admin and Careers feel like one product family.
- Keep dense recruiting data easy to scan and operate.
- Preserve existing Careers routes, workflows, permissions, and data behavior.
- Provide complete loading, empty, error, focus, hover, and disabled states.

## Non-goals

- Redesigning Admin.
- Changing Careers information architecture or business logic.
- Building the external applicant experience.
- Introducing a new theme, component library, icon set, or animation system.

## Personas and tasks

- HR administrators and super administrators working on desktop for long sessions.
- Primary tasks: review openings, scan applicants, move pipeline stages, manage schedules, and inspect history.
- Secondary task: perform urgent checks and small actions on mobile.

## Information architecture

- Dashboard: recruiting status and upcoming work.
- Job postings: list, create, inspect, and edit openings.
- Applicants: search, filter, inspect, and update applications.
- Pipeline: compare applications by stage and move work forward.
- Separate management: review withdrawn or separated records.
- Schedules: inspect upcoming recruiting events.

## Design principles

1. Admin consistency first: use the same typography, grayscale, spacing rhythm, radius, icon weight, and interaction tone.
2. Dense but readable: prefer clear grouping, compact controls, tabular numbers, and predictable alignment.
3. State before decoration: status, hierarchy, and available actions must remain obvious without visual effects.
4. Reuse before invention: use `@repo/ui` and existing Lucide icons before adding app-specific UI.
5. Accessibility is baseline: keyboard access, visible focus, semantic labels, and non-color status cues are required.

## Visual language

### Typography

- Primary font: Pretendard Variable with system sans-serif fallback.
- Base: 13px at desktop product density.
- Page title: 21px, semibold, tight tracking.
- Section title: 14 to 16px, semibold.
- Supporting copy: 12 to 14px, regular, muted gray.
- Numeric summaries use tabular figures.

### Color

- Canvas: `#ffffff`
- Surface: `#ffffff`
- Soft surface: `#fafafc`
- Primary text and primary action: `#1d1d1f`
- Secondary text: `#7a7a7a`
- Hairline border: `rgba(0, 0, 0, 0.08)`
- Panel border: `#ececef`
- Semantic colors are reserved for true warning, error, and success states. Labels must communicate the same meaning without color.

### Shape and elevation

- Control radius: 6 to 8px.
- Panel radius: 10 to 12px.
- Pills are limited to statuses and compact metadata.
- Default elevation is flat. Use borders and surface contrast instead of decorative shadows.

### Spacing and density

- App frame: 24px horizontal and 16px vertical content padding on desktop.
- Panel padding: 16 to 24px depending on information density.
- Table rows: compact enough for scanning, with a minimum practical hit area of 40px.
- Related elements stay close; unrelated sections use clear 16 to 24px separation.

### Icons and motion

- Use the installed Lucide icon family at 1.25 to 1.5 stroke weight.
- Icons support labels; they do not replace unfamiliar actions without an accessible name.
- Transitions are limited to 160ms state feedback.
- Press feedback may scale to 0.98. Disable nonessential motion for `prefers-reduced-motion`.

## Component contracts

- App shell: use the same persistent white Sidebar, top Header, and scrollable ContentFrame structure as Admin.
- Navigation: active item uses dark fill and white text; inactive items use muted text and soft hover surface.
- Page header: one clear title, optional supporting sentence, and one compact action area.
- Panel: white surface without an outer border or decorative shadow.
- Buttons, inputs, selects, dialogs, and tables: reuse `@repo/ui`; app CSS may only align tokens and density.
- Status badge: short Korean label, border or fill contrast, never color alone.
- Data table: white header surface, slate-100 row dividers, slate-50 row hover, left-aligned text, and tabular numeric values.
- Empty and error states: centered message, concise recovery action, no decorative illustration requirement.

## Responsive behavior

- Careers follows the current Admin shell at every viewport: persistent sidebar, top header, and independently scrolling content frame.
- Multi-column summaries and forms collapse to one column before horizontal compression harms readability.
- Tables and pipeline boards may scroll horizontally while keeping their information structure intact.
- No essential action may depend on hover.

## Interaction and accessibility

- Target: WCAG 2.1 AA.
- Use semantic navigation, headings, tables, forms, and dialog structure.
- Every interactive element has a visible focus indicator and an accessible name.
- Loading states use skeletons or explicit progress text.
- Empty states explain what is missing; error states include a retry or recovery path when available.
- Destructive actions remain visually and textually explicit.

## Content voice

- Korean, concise, operational, and specific.
- Prefer task nouns and direct verbs such as `공고 등록`, `단계 변경`, `다시 시도`.
- Avoid promotional language, ambiguous abbreviations, and decorative punctuation.

## Technical constraints

- Next.js 15, React 19, Tailwind CSS 4, and the existing `@repo/ui` package.
- No new UI dependency or duplicated shared primitive.
- Light theme is intentionally locked to the current Admin reference.
- Validate with Careers lint, typecheck, build, responsive source review, and a browser visual check when an attached browser is available.

## User chatbot MVP

### Goal and scope

- Add a small employee-only assistant for two jobs: answer personal leave-balance questions and answer questions grounded in company regulations.
- The assistant is read-only. It does not submit leave, change balances, approve requests, or answer from unverified model knowledge.
- Legal and company-policy answers must be labeled separately because company policy may be more generous than the statutory minimum.

### Entry and conversation

- Add one chatbot launcher to the shared User content layout.
- Desktop: fixed button at the bottom right opening the existing `@repo/ui` Sheet at 400px width.
- Mobile: place the launcher above `BottomNavigation` and open the existing `@repo/ui` Drawer.
- Start with three quick questions: `내 남은 연차`, `연차 부여 기준`, `반차/반반차 규정`.
- Each answer shows a short result, an `기준일`, and one or more source chips: `내 휴가 데이터`, `ACG 사규`, or `근로기준법`.

### Server flow

```text
question
  -> POST /api/chat
  -> authenticated session
  -> personal data lookup and/or regulation context
  -> model generates a grounded answer
  -> answer + structured sources
```

- Personal leave questions reuse the same `leave_balances` fields and annual/monthly aggregation used by the User leave screen. The member ID always comes from `getSessionUser()`, never from request input.
- The MVP regulation corpus is the small, curated `REGULATION_CATEGORIES` dataset. Send the complete published corpus with the question; do not add vector search while it remains small.
- Keep the model call server-only and use native `fetch`; no AI framework dependency is required for the MVP.
- Return one JSON response after generation. Streaming, persistent chat history, file ingestion, and conversation search are not MVP requirements.

### Data processing and response contract

- Move the regulation constants to one shared server/client module so the ACG Life screen and chatbot import the same data.
- Move the existing leave-balance query and aggregation to one server helper used by both `/api/leave-balances` and `/api/chat`; the chat client never sends a member ID or balance value.
- Personal balance questions are deterministic: the server filters `annual` and `monthly`, calculates `total = granted + adjusted`, `remaining = total - used`, and formats the answer without asking the model to calculate it.
- Regulation questions pass only the question and the small complete regulation corpus to the model. The model returns answer wording and source IDs; the server maps those IDs to trusted source labels and dates.

```json
{
  "answer": "2026년 연차는 총 15일이고 4.5일 사용해 10.5일 남았습니다.",
  "sources": [
    {
      "type": "personal",
      "label": "2026년 내 휴가 데이터",
      "href": "/attendance-stats",
      "asOf": "2026-07-30"
    }
  ]
}
```

- The chat UI renders `answer` as the assistant bubble and `sources` as clickable chips below it. It never parses numbers back out of natural-language text.

### Answer rules

- Use retrieved values only. If data or a matching regulation is missing, say that it could not be confirmed and direct the user to HR or the source screen.
- Do not send member ID, name, leave history, or reasons to the model. For personal leave, send only the selected year and aggregated granted, adjusted, used, and remaining values.
- Limit input length, message count, and requests per user. Do not persist chat text by default; operational logs contain only request ID, latency, result type, and error code.
- Legal answers cite the current official source and include a verification date. Individual cases such as attendance rate, leave of absence, or termination require HR confirmation.

### Content prerequisite

- The ACG Life annual-leave copy and User leave screen use the same statutory baseline: one additional day for every 2 years after the first year, up to 25 days.
- Keep one shared regulation source for the ACG Life screen and chatbot so the two surfaces cannot drift.

### Acceptance criteria

- `내 휴가 얼마나 남았어?` returns the signed-in user's current-year total, used, adjusted, and remaining leave values and links to `/attendance-stats`.
- `원래 법정 휴가 며칠이야?` returns the statutory baseline with a `근로기준법 제60조` source and does not present it as the user's actual balance.
- A regulation answer always cites the matched regulation title and update date.
- Questions outside the available data are declined briefly instead of being guessed.
- Authentication, input limits, personal-data minimization, error state, keyboard focus, and mobile navigation overlap are covered by targeted checks.

### Later, only when needed

- When approved policy files in `company_documents` become too large to fit safely in the prompt, add publish-time text extraction and chunk retrieval for `policy` and `hr` documents.
- Add embeddings only after keyword or full-corpus retrieval quality is measured as insufficient. Scanned-file OCR, autonomous actions, and long-term conversation memory remain separate features.

## Open questions

- [ ] Decide whether Admin and Careers should later share one shell component. Owner: frontend. Impact: cross-app maintenance only; current product behavior is not blocked.
- [ ] Select the production model/provider and confirm its data-retention contract. Owner: engineering/security. Impact: implementation and operating cost.
