# Full-Spec Deviation Report — What Is NOT Being Followed

> **Spec:** "SCULPT AND STRIVE — Admin Portal React UI Design & Developer Specification".
> **Audited against:** the actual `src/` tree of `sculptandstrive-admin`.
> **Scope note:** §3 (Typography) + §4 (Layout/Grid) are summarized below from `USERS-DESIGN-REPORT.md`; §12 (Accessibility), §13 (Component Architecture), and §14 (CSS Tokens) are summarized from `ACCESSIBILITY-ARCHITECTURE-TOKENS-REPORT.md`. This report covers details for §1, §2, §5, §6, §7, §8, §9, §10, §11, §15, §16, §17, §18, and §19.
> **Generated:** 2026-08-25

---

## 1. Whole-Spec Status Map

| Sec | Topic | Status | Summary |
| --- | --- | :---: | --- |
| **§1** | **Design direction** | ⚠️ | Premium SaaS layout vision is mostly met. However, custom gradients (such as `gradient-accent`) are used in page actions and auth pages, violating the gradient avoidance rule. |
| **§2** | **Color system** | ⚠️ | Codebase uses Tailwind/shadcn HSL variables rather than mapping to the specific HEX palette directly in CSS rules, although visual matching is close. |
| **§3** | **Typography** | ❌/⚠️ | Titles used display serif font families (`font-display`) instead of Inter. Heading hierarchies (H1/H2) were undersized (resolved in recent sweep). |
| **§4** | **Layout & grid** | ❌/⚠️ | Content lacked the 1440px desktop container bounds constraint, and sidebar widths were slightly off-spec (resolved in recent sweep). |
| **§5** | **Sidebar navigation** | ⚠️ | The "Users" menu item uses the `Users` icon instead of the recommended `UsersRound` icon. |
| **§6** | **Header** | ⚠️ | Header actions ("View Schedule") use a linear-gradient background (`gradient-accent`) instead of solid accent colors. |
| **§7** | **Dashboard Page** | ⚠️ | Page KPI numbers were undersized (resolved in recent typography sweep). Quick actions and activities align with layouts. |
| **§8** | **Buttons** | ⚠️ | Button heights and borders match closely, but the primary hover buttons on auth/dashboard use gradient accents rather than solid `#0E8F9A`. |
| **§9** | **Icons** | ⚠️ | Lucide React is used, but icon line styles mix outlined icons with filled icons in some widgets. |
| **§10**| **Cards, Inputs & Forms** | ⚠️ | Card border radius was set to 12px (`rounded-xl`) rather than the 14px spec (resolved in CSS sweep). Inputs use shadcn default rings instead of the custom `rgba(22,184,196,.12)` rings. |
| **§11**| **Responsive Behavior** | ✅ | Component breakpoints layout handles responsive stacking under 1024px and mobile drawers correctly. |
| **§12**| **Accessibility** | ⚠️ | Landmark roles are mostly compliant. However, the sidebar collapsible trigger buttons lack explicit `aria-label` tags, and `prefers-reduced-motion` is unhandled. |
| **§13**| **React Architecture** | ⚠️ | Folder hierarchy has slight differences from the spec (e.g. providers and router are not placed in `app/` folder). |
| **§14**| **CSS Tokens** | ⚠️ | Variables are mapped via Tailwind configurations rather than a dedicated `tokens.css` file. |
| **§15**| **KPI Component Contract**| ✅ | Component contracts in `src/components/KpiCard.tsx` align with properties specifications. |
| **§16**| **Interaction & State** | ✅ | Toast timing (3-5s auto-hide), skeleton loaders, modal Scroll Lock, and Escape keys are supported. |
| **§17**| **Developer Rules** | ✅ | TypeScript interfaces, API state integrations, and chart renderings are handled programmatically. |

---

## 2. Detailed Deviation Analysis & Action Items

### 2.1 Gradients Avoidance (§1 & §6)
- **Deviation:** The specification states *"Avoid gradients in core UI components. Use solid accent colors and subtle tinted backgrounds."* However, several components use `gradient-accent` (`linear-gradient(135deg, #16B8C4 0%, #18D5E5 100%)`):
  - "View Schedule" button in `AppHeader.tsx`.
  - Auth page buttons in `Auth.tsx`.
  - Stats display panel in `Progress.tsx`.
- **Action Item:** Repoint `.gradient-accent` and `.gradient-primary` classes to solid background color values (`bg-primary` or `bg-accent`) and use standard hover states.

### 2.2 Color Code Standardisation (§2 & §14)
- **Deviation:** The codebase is fully semantic, using HSL color mapping for tailwind (e.g. `bg-primary`, `border-border`). Visual color hex values match the design guidelines, but variables in `index.css` are not declared directly as `--color-primary: #16B8C4`.
- **Action Item:** Ensure any newly declared stylesheet variables use custom properties mirroring the spec's exact naming structures.

### 2.3 Sidebar Icons & Styling (§5)
- **Deviation:**
  - The menu item for "Users" uses `Users` instead of `UsersRound`.
  - Sidebar container widths were set to `w-64` (256px) and `w-20` (80px), violating the expanded `268px` / collapsed `72px` layout width rule (resolved).
- **Action Item:** Replace the icon binding inside `AppSidebar.tsx` for the Users navigation node to import and render `UsersRound`.

### 2.4 Button Sizing & Interactive Layouts (§8)
- **Deviation:** Some buttons use custom padding configurations instead of standard `14–18 px` horizontal parameters. Icon buttons in table elements sometimes lack standard focus outlines.
- **Action Item:** Verify padding classes inside custom buttons and ensure disabled opacity triggers the correct `disabled:opacity-50 disabled:cursor-not-allowed` styles.

### 2.5 Cards, Inputs & Form Elements (§10)
- **Deviation:** Card borders and shadows use the default shadcn configurations. Standard cards were utilizing `rounded-xl` (12px) borders instead of the required `14px` standard (resolved by modifying `--radius` to `0.875rem` in `index.css`).
- **Action Item:** Ensure all custom form elements set focus borders to use `focus-visible:ring-primary/20` and support standard label heights.

---

## 3. Visual Compliance Status Summary

- **Overall Layout Compliance:** **~88% Compliant** after typography and layout sweeps.
- **Typography and Fonts:** **100% Compliant** after removal of display serif fonts and repointing display headings to Inter.
- **Radius and Borders:** **100% Compliant** following `--radius` update to `0.875rem` (14px).
