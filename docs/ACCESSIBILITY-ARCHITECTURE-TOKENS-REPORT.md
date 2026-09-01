# Accessibility, Architecture & Tokens — Design Spec Compliance Report

> **Spec sections checked:** §12 Accessibility (WCAG 2.2 AA), §13 React Component Architecture, §14 CSS Design Tokens.
> **Codebase audited:** `src/` tree of `sculptandstrive-admin` (Vite + React 18 + TS + Tailwind v3 + shadcn/ui + react-router-dom).
> **Generated:** 2026-08-25

---

## 1. Executive Snapshot

| Area                     | Status | Key reason                                                              |
| ------------------------ | ------ | ----------------------------------------------------------------------- |
| Accessibility (§12)      | ⚠️ Mixed | Landmarks mostly present; focus rings OK; **no** `prefers-reduced-motion`; icon-only buttons missing `aria-label` |
| Component architecture (§13) | ❌ Gaps | No `app/` router/providers split; layout & dashboard components not in sub-folders; legacy orphan files |
| CSS design tokens (§14)  | ❌ Mismatch | Tokens use shadcn HSL semantics, **not** the spec's hex/space/radius naming; two CSS bugs found |

---

## 2. §12 Accessibility (WCAG 2.2 AA)

### 2.1 Semantic landmarks

| Landmark   | Spec requirement | Found in code | ✔/✘ |
| ---------- | ----------------- | ------------- | --- |
| `<main>`   | main content      | `DashboardLayout.tsx` line 18 → `<main>` wraps all protected pages | ✔ |
| `<aside>`  | sidebar           | `AppSidebar.tsx` line 51 → `<aside>` | ✔ |
| `<nav>`    | navigation        | `AppSidebar.tsx` line 84 → `<nav>` | ✔ |
| `<header>` | page/app header   | `PageHeader.tsx` is a `<div>`. `AppHeader.tsx` exists and uses `<header>` **but is not imported by App.tsx**. | ⚠️/✘ |
| `<section>`| content sections | Only `Nutrition.tsx` uses `<section>`; Users page relies on plain `<div>` cards. | ⚠️ |

**Gap:** `PageHeader` wraps page titles in a `<div>`, not `<header>`, and page-level card bodies are not `<section>` landmarks. Fix with a `<header>` in `PageHeader.tsx` and `<section>` around dashboard content blocks.

### 2.2 Icon-only buttons: `aria-label` + tooltip

| Location                | `aria-label`? | tooltip? | Status |
| ----------------------- | ------------- | -------- | ------ |
| Sidebar toggle (chevron)| ✘             | ✘        | ❌     |
| Sign-out button         | ✘             | ✔ `title="Sign out"` | ⚠️  |
| Notifications (AppHeader) | ✔ `aria-label="Notifications"` | ✘ | ✔ (but AppHeader unused) |
| Search in PageHeader    | N/A (decorative icon; input uses `placeholder`) | — | ⚠️ input has no explicit `<label>` |

**Gap:** the active sidebar toggle has no accessible name. Add `aria-label="Toggle sidebar"`
and a `Tooltip` (the project already wraps the app in `TooltipProvider`).

### 2.3 Color-alone status communication

- **Role badges** (`Users.tsx:467`): colour + **text label** (`ADMIN`/`USER`/etc.) + icon legend → ✔ colour is not the only signal.
- **`StatCard`** (`StatCard.tsx:21`): `changeType` is green/red/grey, but the **text string is always rendered** → ✔.
- Progress-photo status dots (other pages, not Users) — not audited; flag for the broader suite.

### 2.4 Visible keyboard focus

- shadcn `Button` / `Input` / `Select` include `focus-visible:ring-2` → ✔.
- `Dashboard.tsx:381` custom card-row: `role="button" tabIndex={0}` + `focus:outline-none focus:ring-2 focus:ring-[#16B8C4]/30` → ✔ visible focus.

### 2.5 `prefers-reduced-motion`

**Gap (fails spec).** `src/index.css` defines motion keyframes (`fadeIn`,
`slideUp`, `slideInLeft`, `scaleIn`) exposed as `animate-*` utilities. They are
applied via className (e.g. `StatCard` → `animate-slide-up`, sidebar → `animate-fade-in`)
with **no `@media (prefers-reduced-motion)` guard**. `App.css:30` guards one
legacy logo spin, but the *active* UI animations do not.

```css
/* Add to src/index.css */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-slide-up,
  .animate-slide-in-left,
  .animate-scale-in {
    animation: none !important;
    transition: none !important;
  }
}
```

### 2.6 Charts — accessible summaries / tabular data

The Users section renders **no charts** (the profile dialog uses stat cards + text
log). The project ships a recharts wrapper (`src/components/ui/chart.tsx`) used
elsewhere. Recommendation for the wider suite: every `Chart` needs a `<caption>`
or hidden `aria-label` + a hidden `<table>` of source values.

---

## 3. §13 React Component Architecture

### 3.1 Spec vs. actual structure

| Spec wants                                  | Actual in repo                                          | ✔/✘ |
| ------------------------------------------- | ------------------------------------------------------ | --- |
| `src/app/router.tsx`                        | Routing inline in `src/App.tsx` (react-router `BrowserRouter` + `Routes`) | ✘ |
| `src/app/providers.tsx`                     | Providers (Query, Tooltip, Auth, Theme) nested in `App.tsx` | ✘ |
| `src/components/layout/AdminLayout.tsx`     | `src/components/DashboardLayout.tsx` (flat, no `layout/`) | ✘ |
| `src/components/layout/Sidebar.tsx`         | `src/components/AppSidebar.tsx` (flat)                 | ✘ |
| `src/components/layout/Header.tsx`          | `src/components/AppHeader.tsx` exists but **unused**   | ⚠️ |
| `src/components/dashboard/KpiCard.tsx` etc. | `src/components/StatCard.tsx`, `ReadoutCard.tsx` (flat) | ✘ |
| `src/components/ui/IconButton.tsx`          | Not present; `Button variant="ghost" size="icon"` inline | ⚠️ |
| `src/components/ui/Skeleton.tsx`            | Present & used (`Users.tsx` imports `Skeleton`)        | ✔ |
| `src/pages/UsersPage.tsx` (etc.)            | `src/pages/Users.tsx` (no `Page` suffix)               | ⚠️ |
| `src/lib/api.ts` / `src/lib/formatters.ts`  | API in `integrations/supabase/`; formatters inline     | ✘ |
| `src/theme/tokens.css` / `globals.css`      | All styles in `src/index.css`; no `theme/` folder       | ✘ |

### 3.2 Structural issues

1. **Unused legacy files.** `AppHeader.tsx` + `App.css` are NOT imported by
   `App.tsx` (which uses `DashboardLayout`/`AppSidebar`). Dead weight from the
   original shadcn template. Either wire `AppHeader` in or delete both.
2. **Commented-out duplicate routes.** `App.tsx:59–128` is a large commented block
   re-declaring every protected route — confusing dead code. Remove it.
3. **No top `Header.tsx`.** With `DashboardLayout` there is no headerbar
   component; the page title bar lives in `PageHeader.tsx` (a `<div>`).
4. **`IconButton` missing.** The spec calls for an `IconButton` primitive. The
   codebase reuses `Button variant="ghost" size="icon"` everywhere. Creating
   `src/components/ui/icon-button.tsx` standardises this and makes the
   `aria-label`-required pattern explicit.


---

## 4. §14 CSS Design Tokens

### 4.1 Token comparison — spec vs. actual

| Spec token                | Spec value                              | Actual repo (`src/index.css`)                                  | ✔/✘ / note                                                                 |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `--color-primary`         | `#16B8C4` (bright teal)                 | `--primary: 215 70% 20%` (very dark navy) → used as the button/navy brand | ✘ **different palette** (dark navy vs. teal)                              |
| `--color-primary-dark`    | `#0E8F9A`                               | no equivalent                                                | ✘                                                                         |
| `--color-primary-soft`    | `#E8F8F8`                               | no equivalent                                                | ✘                                                                         |
| `--color-navy-950`        | `#071B33`                               | `--sidebar-background: 215 70% 12%` (HSL navy)               | ⚠️ concept exists but named differently / HSL not hex                    |
| `--color-text-950/700/500`| `#111827` / `#334155` / `#64748B`       | `--foreground`, `--card-foreground`, `--muted-foreground` (HSL) | ⚠️ exists but under shadcn semantic names, not `--color-text-*`          |
| `--color-page`            | `#F5F7F9`                               | `--background: 210 25% 97%`                                  | ⚠️ close value, wrong name                                               |
| `--color-surface`         | `#FFFFFF`                               | `--card: 0 0% 100%`                                          | ⚠️ exists, wrong name                                                    |
| `--color-border`          | `#E2E8F0`                               | `--border: 214 20% 88%`                                      | ⚠️ exists, wrong name                                                    |
| `--color-success/info/purple/warning/danger` | hex teal/indigo/amber/red   | `--success`, `--accent`(teal), `--warning`, `--destructive`, `--info`? | ⚠️ `--info`/`--color-purple` missing; `--accent` conflates the spec teal |
| `--radius-sm` / `--md` / `--lg` | 8 / 10 / 14 px                       | single `--radius: 0.875rem` (14 px)                          | ✘ only the `--lg` tier; no `--radius-sm`/`--radius-md`                   |
| `--space-1`…`--space-8`   | 4/8/12/16/20/24/32 px                   | **none** — uses Tailwind `p-4`, `gap-2`, `h-4` etc. directly  | ✘ no named space tokens                                                  |
| `--shadow-card`           | `0 4px 18px rgba(15,23,42,.05)`          | `--shadow-card: 0 1px 3px hsl(...)`                          | ✘ different value (and see bug below)                                    |

**Root cause:** the repo adopted shadcn's **semantic HSL token convention**
(`--background`, `--primary`, `--card`, `--radius`), while §14 specifies a
**named hex token system** (`--color-*`, `--radius-sm/md/lg`, `--space-*`).
They are not 1:1 compatible; bridging them requires a token-mapping layer.

### 4.2 CSS bugs found in `src/index.css`

1. **Malformed custom properties (lines 76–79):**
   ```css
   --text-small :font-size: 90%;
   --text-medium :font-size: 100%;
   --text-large : font-size: 110% ;
   --text-xlarge : font-size: 120% ;
   ```
   The embedded `:font-size:` makes these **invalid custom-property declarations**
   (the `:` is illegal inside a custom-property name). They are silently dropped.
   The *functional* rules are the classes further down (`.text-small { ... }`),
   but the `--text-*` vars are dead. Remove the broken lines.

2. **Undefined shadow variables.** `.surface` (line 249) uses
   `box-shadow: var(--shadow-soft)` and `.surface-elevated` (line 253) uses
   `var(--shadow-xl)` — **neither is defined** in `:root`. Those utilities render
   with no shadow. Define `--shadow-soft` / `--shadow-xl` (or delete the classes).

### 4.3 Migration recommendation

Add a thin token layer that maps the spec's named values onto the existing
shadcn semantics so both systems coexist:

```css
:root {
  /* Spec colour names → shadcn HSL values */
  --color-primary:        #16B8C4;          /* teal (new) */
  --color-primary-dark:   #0E8F9A;
  --color-primary-soft:   #E8F8F8;
  --color-navy-950:       #071B33;
  --color-text-950:       #111827;
  --color-text-700:       #33415B;
  --color-text-500:       #64748B;
  --color-page:           #F5F7F9;
  --color-surface:        #FFFFFF;
  --color-border:         #E2E8F0;
  --color-success:        #10B981;
  --color-info:           #4F7CFF;
  --color-purple:         #7C5CFC;
  --color-warning:        #F59E0B;
  --color-danger:         #EF4444;

  /* Spec radius / space / shadow tiers */
  --radius-sm:  0.5rem;   /* 8 px  */
  --radius-md:  0.625rem; /* 10 px */
  --radius-lg:  0.875rem; /* 14 px */
  --space-1:     0.25rem;   /* 4 px  */
  --space-2:     0.5rem;    /* 8 px  */
  --space-3:     0.75rem;   /* 12 px */
  --space-4:     1rem;      /* 16 px */
  --space-5:     1.25rem;   /* 20 px */
  --space-6:     1.5rem;    /* 24 px */
  --space-8:     2rem;      /* 32 px */
  --shadow-card: 0 4px 18px rgba(15, 23, 42, .05);
}
```
Then point components at `--radius-lg` / `--color-*` so the spec values become
the single source of truth, and remove the broken `--text-*` declarations.

