# Project Memories – Dashboard + Sidebar (Stable as of latest checkpoint)

This file captures the relevant context so a new chat can continue seamlessly.

## Dashboard state
- Balance chart: implemented with Recharts (not Tremor) for full control
  - File: `app/components/dashboard/SimpleBalanceChart.tsx`
  - Uses `ResponsiveContainer + LineChart + Tooltip` with custom tooltip (white card, shadow)
  - X labels: `DD.MM`, Y axis: CHF formatted (numbers only on axis)
  - Dynamic Y-domain: min/max from data with ~10% padding (includes 0)
  - Series starts “tomorrow” (today excluded); contiguous daily points are generated
- Undercoverage announcement: now part of the KPI "Reichweite" card (not a top banner)
  - Files:
    - `app/components/dashboard/ModernKpiCards.tsx` – added `firstNegative?: Date` prop, renders a small red badge “Unterdeckung ab DD.MM.YYYY” inside the card
    - `app/(authenticated)/dashboard/page.tsx` – passes `firstNegative` from computed KPI data
- KPI computation (runway): forecast‑based – days until first negative `kontostand`, converted to months
  - thresholds (ModernKpiCards): healthy ≥ 3 months, critical < 2, else warning
- Cost structure donut
  - File: `app/components/dashboard/CostStructureDonut.tsx`
  - Recharts `PieChart/Pie/Cell`, fixed color palette, custom tooltip, legend `text-sm`
  - Data: last month’s Outgoing grouped by `kategorie` (top 5 + “Andere”)
- Overdue incoming invoices card
  - Files: `app/components/dashboard/OverdueIncomingInvoices.tsx`, wired in `dashboard/page.tsx`
  - Filter aligns with Planung: uses `shifted === true` from `enhanceTransactions` (past-due Incomings shifted to tomorrow)
  - Shows: INVOICE (uppercase, non-wrapping badge), Customer, Amount, and "(X Tage überfällig)"
  - Overdue days use `original_date` preserved when shifting
- Upcoming large outflows + Simulation effects
  - `UpcomingLargeOutflows.tsx`: Outgoing ≥ 5’000 within next 60 days
  - `SimulationEffectsCard.tsx`: lists simulation tx until EOM + shows total delta badge

## Data/Services changes
- `lib/services/buchungen.ts`
  - `shiftPastDueDateIfNeeded` preserves `original_date` when shifting to tomorrow and sets `shifted: true`
  - `enhanceTransactions` pipeline applies shifting and adjustments; `firstNegative` is derived downstream for KPI
- Types
  - `models/types.ts`: `Buchung` includes `original_date?: Date` and `shifted?: boolean`

## Global styling/tooltips
- Consolidated, minimal Recharts overrides in `app/globals-tooltip.css`
  - Kept only grid and line thickness; stopped interfering with default tooltips elsewhere
  - Balance chart + donut use custom React tooltips, not the default

## Sidebar (Navigation) – final design
- File: `components/layout/Sidebar.tsx`
- Header logo
  - Expanded: `public/assets/vaios-logo.svg`
  - Collapsed: `public/assets/vaios-icon.svg` (brand icon), centered
- Collapsible behaviour
  - Collapse toggle at the bottom (not near the logo)
  - Collapsed state persisted in `localStorage` under key `sidebarCollapsed` ("1"/"0")
  - On expand: sidebar keeps width transition; the balance section content fades in after ~250 ms (no width grow)
- Integrated content
  - Logo + user info + logout all live inside the Sidebar (no separate top header)
  - Logout fix: uses `useRouter().push('/login')` with hard fallback (`window.location`) after `auth.signOut()`
- Floating/sticky behavior
  - Desktop: floating look with rounded corners, blur and shadow; height `calc(100vh - 1.5rem)` to keep equal top/bottom margins
  - Sticky on desktop, full height; mobile behaves normally
- Icons: all SVG (no emojis) – dashboard/calendar/wallet/users/import; admin tools removed
- Collapsed tooltips
  - Custom fixed-position tooltip (white card) appears on hover for each nav icon showing `name` and `description`

## Other notes / decisions
- Top warning banner removed; message is inside the "Reichweite" card
- `.npmrc` uses `legacy-peer-deps=true` due to Tremor/React peer issues previously
- Tremor components are still used where sensible (lists, cards), but complex charts use Recharts directly for styling/tooltip control

## Open ideas / Backlog pointers
- Jahresziel (annual revenue goal) KPI: requires DB field + dashboard KPI
- Cleanup pass for unused files can be revisited once new features are in

## Quick file map
- Sidebar: `components/layout/Sidebar.tsx`
- KPI cards: `app/components/dashboard/ModernKpiCards.tsx`
- Balance chart: `app/components/dashboard/SimpleBalanceChart.tsx`
- Overdue invoices: `app/components/dashboard/OverdueIncomingInvoices.tsx`
- Cost donut: `app/components/dashboard/CostStructureDonut.tsx`
- Large outflows: `app/components/dashboard/UpcomingLargeOutflows.tsx`
- Simulation effects: `app/components/dashboard/SimulationEffectsCard.tsx`
- Dashboard page wiring: `app/(authenticated)/dashboard/page.tsx`
- Services: `lib/services/buchungen.ts`
- Global chart CSS: `app/globals-tooltip.css`

This snapshot corresponds to the latest “Stable checkpoint” commits.


