# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-07-28
- Surfaces: `apps/admin`, `apps/careers`
- Reference implementation:
  - `apps/admin/app/globals.css`
  - `apps/admin/app/(dashboard)/layout.tsx`
  - `apps/admin/components/Sidebar.tsx`
  - `apps/admin/components/Header.tsx`
  - `apps/admin/components/DashboardContentFrame.tsx`
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

## Open questions

- [ ] Decide whether Admin and Careers should later share one shell component. Owner: frontend. Impact: cross-app maintenance only; current product behavior is not blocked.
