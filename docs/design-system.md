# Design System (Figma-derived)

Token sources: Figma variables (NADA Figma Demo 2025) and this app’s Tailwind theme.

## Where tokens live

- **Tailwind:** [tailwind.config.js](../tailwind.config.js) — `theme.extend` (colors, fontFamily, spacing, boxShadow, borderRadius).
- **Global CSS:** [src/index.css](../src/index.css) — `:root` CSS variables and base typography.

## Typography

- **Font:** Barlow (primary), Instrument Sans (fallback). Sizes/weights from Figma:
  - Title 1: 32px, SemiBold (600)
  - Body large bold: 16px, SemiBold (600)
  - Body small: 14px, Regular (400)
- Use `font-sans` (Barlow) and Tailwind text sizes; use `font-semibold` / `font-normal` for weight.

## Color roles

| Role | Tailwind | Hex / usage |
|------|----------|-------------|
| Primary | `primary`, `primary-secondary` | `#1A9375`, `#126550` — buttons, sidebar, links |
| Surface page | `surface-page` | `#f4f4f4` — main content background |
| Surface container | `surface-container` | `#ffffff` — cards, panels |
| Surface stroke | `surface-stroke` | `#dcdcdc` — borders |
| Text default | `text-copy-default` | `#111115` — headings, body |
| Text muted | `text-copy-muted` | `#6f6f77` — labels, secondary text |
| Text subtle | `text-copy-subtle` | `#4e4e55` — timestamps, hints |
| Success | `success`, `success-50`, `success-700` | Positive KPIs, status badges |
| Danger | `danger`, `danger-50`, `danger-700` | Risk, defectors, errors |
| Warning | `warning`, `warning-50`, `warning-700` | Recalls, caution |

## Spacing and shadows

- **Spacing scale:** 8, 10, 12, 16, 24 (use `ds-8`, `ds-12`, etc., or Tailwind 2, 2.5, 3, 4, 6 where they align).
- **Card shadow:** `shadow-card` — `0 1px 2px 0 rgba(0,0,0,0.05), inset 0 -1px 0 0 rgba(0,0,0,0.1)`.
- **Border radius:** `rounded-card` (12px), `rounded-button` (8px), `rounded-input` (8px).

## Buttons (primary & secondary)

Primary and secondary buttons use **semi-bold** weight, **all-caps** labels, and **5% letter spacing** (`tracking-wider` = 0.05em), aligned with Shift Mobile DS.

- **Primary:** `bg-primary hover:bg-primary-secondary text-white rounded-button font-semibold uppercase tracking-wider` (optionally `shadow-card`). Use for main CTAs (Create, Launch, Save, Ask, etc.).
- **Secondary:** `bg-surface-container border border-primary text-primary hover:bg-primary-50 rounded-button font-semibold uppercase tracking-wider`. Use for Cancel, Dismiss, Export CSV, Export Report, Contact, View Active Campaigns, etc. Stroke and text use primary green (#1A9375).
- Sizing: use `px-3 sm:px-4 py-2` or `px-4 py-2`, `text-xs sm:text-sm` or `text-sm`; keep the Search “Ask” button consistent with others (`flex items-center justify-center px-4 py-2 min-h-[36px]`).

## Component pointers

- **UI primitives:** [src/components/ui/](../src/components/ui/) — Card, KPIWidget, ScoreBadge, GridBackground, GoodwillWidget.
- **Maps & overlays:** [src/components/maps/SchematicMap.jsx](../src/components/maps/SchematicMap.jsx), [SingleCustomerMap.jsx](../src/components/maps/SingleCustomerMap.jsx) — legend, map-type controls, close button, and overlay cards use `surface-container`, `text-copy-default` / `text-copy-muted`, `border-surface-stroke`, `shadow-card`. Geofence popups and tooltips use token-derived colours (see `.geofence-tooltip` in [src/index.css](../src/index.css), `var(--color-text-default)` for dark tooltip background).
- **Theme config:** [tailwind.config.js](../tailwind.config.js) — extend colors, shadows, and radius here when syncing from Figma.
