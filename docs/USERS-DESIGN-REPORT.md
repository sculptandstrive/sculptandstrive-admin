# Users Section — Design Specification Compliance Report

> **Scope:** `src/pages/Users.tsx` (and dependencies `PageHeader`, `StatCard`, `DashboardLayout`, `AppSidebar`, `typography.tsx`, shadcn UI primitives).
> **Spec source:** Typography + Layout & Grid tokens provided for the admin dashboard.
> **Generated:** 2026-08-25

---

## 1. Executive Summary

The **Users** page (`User Management`) is the largest data-surface in the admin
dashboard: a searchable registry table, a multi-row action bar, and a detailed
client profile dialog with stats, health data, check-ins, and progress photos.

Against the provided design tokens the page is **partially compliant**:

| Area                | Compliant | Total | Notes                                                       |
| ------------------- | :-------: | :---: | ----------------------------------------------------------- |
| Typography          |     6     |   8   | Font-family & H1/H2/H3/KPI sizes are off; body + buttons ok |
| Layout & Grid       |     4     |   9   | Max-width, grid cols, sidebar & KPI breakpoints missing     |
| Border radius       |     2     |   3   | Cards sit at 12px, not the 14px standard                    |

**Priority fix:** adopt `Inter` everywhere it currently falls back to
`Playfair Display`, correct the H1/H2/KPI display sizes, and add the 1440 px
content constraint + sidebar-width tokens.

---

## 2. Reference: Provided Design Tokens

### 2.1 Typography

| Token        | Font  | Size      | Weight | Line h | Usage                |
| ------------ | ----- | --------- | ------ | ------ | -------------------- |
| Display / H1 | Inter | 30–32 px  | 700    | 1.2    | Dashboard title      |
| H2           | Inter | 20–22 px  | 700    | 1.3    | Major section titles |
| H3           | Inter | 16–18 px  | 700    | 1.35   | Card headings        |
| Body         | Inter | 14 px     | 400    | 1.5    | Normal content       |
| Body Medium  | Inter | 14 px     | 500    | 1.5    | Navigation, labels   |
| Small        | Inter | 12 px     | 400–500| 1.4    | Metadata/helper text |
| KPI Value    | Inter | 30–34 px  | 700    | 1.1    | Dashboard numbers    |
| Button       | Inter | 14 px     | 600    | 1      | Buttons              |

**Family stack:** `Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### 2.2 Layout & Grid

| Property                       | Value                                  |
| ------------------------------ | -------------------------------------- |
| Desktop content max-width      | 1440 px                                |
| Page horizontal padding        | 24–32 px                               |
| Sidebar width (expanded)       | 268 px                                 |
| Sidebar width (collapsed)      | 72 px                                  |
| Header height                  | 80 px                                  |
| Main content top spacing       | 24–32 px                               |
| Primary grid                   | 12 columns, 20–24 px gutters           |
| KPI row (large desktop)        | 4 equal cards                          |
| KPI row (below 1100 px)        | 2 × 2                                  |
| KPI row (below 700 px)         | single column                          |
| Card padding                   | 20–24 px (compact cards: 16 px)        |
| Standard border radius         | 14 px                                  |
| Small controls radius          | 8–10 px                                |
| Pill / badge radius            | 999 px                                 |

---

## 3. Current State — Users Section Anatomy

`Users.tsx` renders, inside a `DashboardLayout`:

1. **Page header** — `PageTitle` "User Management" + description "Real-time access control." + a search input. *(lines 407–419)*
2. **Registry card** — a `Card` with `CardTitle` "Registry (N)" and an embedded `Table` of users (name, email, role badge, actions). *(lines 421–527)*
3. **Assign Group dialog** — `Dialog` with a group `Select`. *(lines 530–584)*
4. **Role-change confirmation** — a compact `AlertDialog`. *(lines 591–604)*
5. **Client Profile dialog** — `Dialog` (max-w-4xl) with a 3-column KPI summary, health questionnaire, weekly check-in log, and progress photos. *(lines 606–771)*

Dependencies: `PageHeader` → `PageTitle`/`PageSubtitle` (`typography.tsx`),
`DashboardLayout`, `AppSidebar`, shadcn `Card`, `Button`, `Badge`, `Input`,
`Select`, `Table`, `Dialog`.

## 4. Typography — Compliance Analysis

| # | Token (spec)                          | Found in code                                        | Size       | Weight            | Fonts used                              | Status | Gap                                                              |
| - | ------------------------------------- | ---------------------------------------------------- | ---------- | ----------------- | --------------------------------------- | ------ | ---------------------------------------------------------------- |
| 1 | Display / H1 (30–32 / 700 / 1.2)      | `PageHeader` → `PageTitle`                           | 24 px (`text-2xl`) | 700 (`font-bold`) | `font-display` **(Playfair Display, serif)** | ❌     | 6–8 px too small; **serif font**, should be Inter                |
| 2 | H2 (20–22 / 700 / 1.3)                | Registry card `CardTitle` "Registry (N)"             | 16 px (`text-base`) | 600 (`font-semibold`) | shadcn default (Inter, light)           | ❌     | 4–6 px too small; weight 600 ≠ 700                               |
| 3 | H3 (16–18 / 700 / 1.35)               | Dialog section headings (`h4`)                       | 14 px (`text-sm`)¹ | 700 (`font-bold`)  | shadcn default (Inter)                  | ⚠️/❌ | No true H3 tier; `h4` headings are 14 px, not 16–18              |
| 4 | Body (14 / 400 / 1.5)                 | Table cell text, dialog body copy                    | 14 px (`text-sm`) | 400               | Inter                                   | ✅     | —                                                                |
| 5 | Body Medium (14 / 500 / 1.5)          | "Assign Coach:" label                                | 12 px (`text-xs`)² | 600 (`font-semibold`) | Inter                                   | ⚠️     | 2 px too small (12 vs 14); weight 600 vs 500                     |
| 6 | Small (12 / 400–500 / 1.4)            | Helper micro-copy, timestamps                         | 12 px (`text-xs` / `text-[10px]`)³ | 400–500           | Inter                                   | ✅     | —                                                                |
| 7 | KPI Value (30–34 / 700 / 1.1)         | Profile-dialog stat numbers                          | 20 px (`text-xl`) | 700 (`font-bold`)  | Inter                                   | ❌     | 10–14 px too small                                               |
| 8 | Button (14 / 600 / 1)                 | All `Button` / `AlertDialogAction` / `SelectTrigger` | 14 px (`text-sm`) | 600 (`font-semibold`) | Inter                                   | ✅     | —                                                                |

**Notes**

1. The `h4` section titles are styled `text-sm font-bold` — 14 px, not the H3 slot (16–18 px).
2. "Assign Coach:" uses `font-semibold` (600) at `text-xs` (12 px).
3. Progress-photo date labels use `text-[10px]`; the 10 px ones are below the Small spec.

**Font-family root cause.** `tailwind.config.ts` maps
`display: ['Playfair Display', 'Georgia', 'serif']` and `PageTitle` uses
`font-display`. Change `PageTitle` to `font-sans` (Inter) and drop the Playfair
import unless the brand logotype specifically needs it.

## 5. Layout & Grid — Compliance Analysis

| # | Property (spec)                      | Found in code                                          | Value found                                | Status | Gap                                                            |
| - | ------------------------------------ | ------------------------------------------------------ | ------------------------------------------ | ------ | -------------------------------------------------------------- |
| L1 | Desktop max-width 1440 px            | `DashboardLayout` `main` has **no** max-width          | `max-w-none`                               | ❌     | Content can exceed 1440 px                                      |
| L2 | Page horizontal padding 24–32 px     | `DashboardLayout` main: `p-6 lg:p-8`                   | 24 px / 32 px                              | ✅     | —                                                               |
| L3 | Sidebar 268 / 72 px                  | `AppSidebar`: `w-64` (256 px) / `w-20` (80 px); `DashboardLayout` offset `ml-[250px]` | 256 / 80 / 250 px                          | ❌     | 12 px / 8 px / 18 px off-spec                                   |
| L4 | Header height 80 px                  | `AppSidebar` brand area: `h-20`                        | 80 px                                      | ✅     | —                                                               |
| L5 | Main content top spacing 24–32 px    | `DashboardLayout` `p-6 lg:p-8`                         | 24 / 32 px                                 | ✅     | —                                                               |
| L6 | 12-column grid, 20–24 px gutters     | Registry table full-width `Card` + `Table`; KPI summary `grid-cols-3` | Not applied                                 | ❌     | No 12-col system; gutters untokenised                            |
| L7 | KPI row breakpoints (4→2×2→1)        | Dashboard `StatCard` row uses `sm:grid-cols-3` (3 cols); Users stats inside dialog | 3 cols, no 1100/700 px rules               | ❌     | Wrong column count; breakpoints missing                        |
| L8 | Card padding 20–24 px                | shadcn `CardHeader`/`CardContent`: `p-5`               | 20 px                                      | ✅     | —                                                               |
| L9 | Border radius (14 / 8–10 / 999)      | Cards `rounded-xl` (12 px); Button `rounded-[10px]` (10 px); Badge `rounded-full` | 12 / 10 / full                             | ⚠️     | Card radius is 12 px not 14 px; badge `rounded-full` ✓            |

**Key layout observations**

- **L3 — Sidebar width.** `DashboardLayout` shifts main with `ml-20 lg:ml-[250px]`.
  The spec is 268 px expanded → 72 px collapsed. Neither matches, so at the `lg`
  breakpoint content sits 18 px too far left and the collapsed sidebar is 8 px too wide.
- **L6 — Grid.** The registry table is constrained only by the card. The spec's
  12-column 20–24 px-gutter system is never introduced; the profile-dialog KPI
  bar uses `grid-cols-3 gap-4`. Wrap page regions in a
  `container max-w-[1440px] mx-auto` and a `grid grid-cols-12 gap-[20px]` shell.
- **L9 — Radius.** Only the card base differs (12 → 14). A single token change
  (`--radius: 0.875rem`) fixes it.


## 6. Priority Action Items

### ✅ P0 — must-do (visible brand impact)

1. **Repoint `font-display` to Inter** (or stop using it on `PageTitle`). `tailwind.config.ts` maps `display: ['Playfair Display', ...]`; `PageTitle` uses `font-display`. Switch to `font-sans` (Inter) and drop the Playfair import unless the logotype needs it.
2. **Fix the Display / H1 size.** `PageTitle` is `text-2xl` (24 px) → `text-[30px] sm:text-[32px] leading-[1.2]`.
3. **Fix the card H2 heading.** `CardTitle` is `text-base font-semibold` → `text-[20px] sm:text-[22px] font-bold leading-[1.3]`.
4. **Add the 1440 px constraint.** In `DashboardLayout`, wrap main content in `max-w-[1440px] mx-auto`.
5. **Correct sidebar widths** to spec: expanded `w-[268px]`, collapsed `w-[72px]`, offset `ml-[72px] lg:ml-[268px]`.

### ⚠️ P1 — polish (consistency)

6. **Profile KPI numbers** — `text-xl` → `text-[30px] sm:text-[34px] font-bold leading-[1.1]`.
7. **Dialog section headings** — standardise `h4` to H3: `text-[16px] sm:text-[18px] font-bold leading-[1.35]`.
8. **Border radius** — set `--radius: 0.875rem` in `src/index.css`.
9. **KPI row breakpoints** — Dashboard grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5`.

### 📝 P2 — optional

10. Add named typography utility classes in `index.css` (`@layer utilities`): `.text-display`, `.text-h2`, `.text-h3`, `.text-kpi`, `.text-btn`.
11. Add layout tokens `--layout-sidebar`, `--layout-header-height`, `--layout-gutter` referenced in components.


## 7. Code-Level Change Snippets

### 7.1 `src/components/ui/typography.tsx` — fix `PageTitle` (H1) & add H2/H3 tokens

```tsx
// PageTitle → Display / H1 (spec: 30–32 px / 700 / 1.2, Inter)
export const PageTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn(
        "text-[30px] sm:text-[32px] font-sans font-bold leading-[1.2] text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
PageTitle.displayName = "PageTitle";

// H2 Major section title (spec: 20–22 px / 700 / 1.3)
export const SectionHeading = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-[20px] sm:text-[22px] font-sans font-bold leading-[1.3] text-foreground", className)}
      {...props}
    />
  ),
);
SectionHeading.displayName = "SectionHeading";

// H3 Card heading (spec: 16–18 px / 700 / 1.35)
export const CardHeading = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-[16px] sm:text-[18px] font-sans font-bold leading-[1.35] text-foreground", className)}
      {...props}
    />
  ),
);
CardHeading.displayName = "CardHeading";
```

### 7.2 `src/components/ui/card.tsx` — align `CardTitle` to H2 spec

```tsx
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-[20px] sm:text-[22px] font-bold leading-[1.3] tracking-tight",
        className,
      )}
      {...props}
    />
  ),
);
```

### 7.3 `src/components/DashboardLayout.tsx` — 1440 px constraint + correct sidebar offset

```tsx
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 ml-[72px] lg:ml-[268px] transition-all duration-300">
        <div className="max-w-[1440px] mx-auto w-full p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
```

### 7.4 `src/components/AppSidebar.tsx` — spec sidebar widths

```tsx
<aside
  className={cn(
    "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out flex flex-col",
    sidebarCollapsed ? "w-[72px]" : "w-[268px]",   // was w-64 / w-20
  )}
>
  {/* Header: h-20 = 80 px ✓ */}
  <div className="flex items-center h-20 px-4 border-b border-sidebar-border"> ... </div>
  ...
</aside>
```

### 7.5 `src/index.css` — radius token (L9) + utility classes (P2)

```css
:root {
  /* ...existing vars... */
  --radius: 0.875rem;          /* 14 px (was 0.625rem / 10 px) */
  --radius-sm: 0.5rem;        /* 8–10 px small controls */
}

@layer utilities {
  .text-display  { @apply text-[30px] sm:text-[32px] font-sans font-bold leading-[1.2]; }
  .text-h2       { @apply text-[20px] sm:text-[22px] font-sans font-bold leading-[1.3]; }
  .text-h3       { @apply text-[16px] sm:text-[18px] font-sans font-bold leading-[1.35]; }
  .text-body     { @apply text-sm font-sans font-normal leading-[1.5]; }
  .text-body-md  { @apply text-sm font-sans font-medium leading-[1.5]; }
  .text-small    { @apply text-xs font-sans font-medium leading-[1.4]; }
  .text-kpi      { @apply text-[30px] sm:text-[34px] font-sans font-bold leading-[1.1]; }
  .text-btn      { @apply text-sm font-semibold leading-none; }
}
```



### 7.6 `src/pages/Dashboard.tsx` — KPI row responsive grid (L7)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
</div>
```
(Tailwind v3 in this repo — `max-[700px]:grid-cols-1` is supported via bracket notation; `lg:` handles the 1100 px → 4-col step.)

### 7.7 `src/pages/Users.tsx` — profile-dialog KPI numbers (§6 action #6)

```tsx
// Before
<span className="text-xl font-bold text-foreground">{profileData.workoutsSummary.totalCount}</span>

// After
<span className="text-[30px] sm:text-[34px] font-bold leading-[1.1] text-foreground">
  {profileData.workoutsSummary.totalCount}
</span>
```


## 8. Compliance Summary (at-a-glance)

```
Typography
  Display/H1  ❌  (24px→30-32px, Playfair→Inter)
  H2          ❌  (16px→20-22px, 600→700)
  H3          ⚠️❌ (14px h4s→16-18px, no true H3 tier)
  Body        ✅  (14px / 400)
  Body Medium ⚠️  (12px→14px, 600→500 on some labels)
  Small       ✅  (12px; a few 10px outliers)
  KPI Value   ❌  (20px→30-34px)
  Button      ✅  (14px / 600)

Layout & Grid
  Max-width   ❌  (none → add 1440px)
  Padding     ✅  (p-6 lg:p-8)
  Sidebar     ❌  (256/80 → 268/72)
  Header h    ✅  (h-20 = 80px)
  Top spacing ✅  (24-32px)
  12-col grid ❌  (not applied)
  KPI rows    ❌  (3-col → 4 / 2×2 / 1 with breakpoints)
  Card pad    ✅  (p-5 = 20px)
  Radius      ⚠️  (card 12px → 14px)
```

---

## 9. Recommendation

Apply the **P0** items (§6) in this order — they deliver the biggest perceptual lift
with the fewest files touched:

1. `tailwind.config.ts` / `typography.tsx` — make `Inter` the headline font.
2. `typography.tsx` + `card.tsx` — fix H1 / H2 sizes and weights.
3. `DashboardLayout.tsx` — add the 1440 px wrapper and spec sidebar offsets.
4. `index.css` — flip `--radius` to `0.875rem`.
5. `Dashboard.tsx` — KPI row to 4 / 2×2 / 1.

After those five edits the Users section (and Dashboard) will be fully aligned to
the provided design tokens. The P1/P2 items (dialog KPI sizing, utility-class
tokens) can ship as a follow-up sweep.

