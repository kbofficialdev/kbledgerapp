---
name: Luminous Ledger Glass
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#ba0035'
  on-tertiary: '#ffffff'
  tertiary-container: '#e21e49'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  currency-stat:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-xs:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.75rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system reimagines high-velocity rural retail, village distribution, and offline-first commerce management into a premium, hyper-fluid digital experience. Moving decisively away from dense, flat spreadsheet paradigms, the interface balances industrial utility with ethereal modernism.

The design movement is **Refined Glassmorphism with Luminous Dark/Light Accents**. Key visual characteristics include:
- Soft mesh gradients and ambient radial glows that illuminate specific operational hubs.
- Translucent layered cards (`backdrop-filter: blur(...)`) with razor-sharp micro-borders (`rgba(255, 255, 255, 0.4)` on light, `rgba(255, 255, 255, 0.08)` on dark) simulating multi-plane optical glass.
- A signature floating dock navigation bar anchored at the bottom or floating fluidly at the sidebar perimeter, mimicking modern mobile OS dock ergonomics.
- Functional chromatic categorization: emerald for active transactional billing & real-time counter states; deep indigo for geographic village hubs & merchant master accounts; vivid rose/crimson for high-alert credit exposures (Udhaar balances); and royal electric violet for digital UPI / PhonePe settlement pipelines.

## Colors

The chromatic architecture serves both tactile aesthetics and instant financial legibility in busy shopkeeper environments:

- **Primary (`#059669` Emerald)**: Anchors live counter billing, active session pulses, successful instant collections, and credit settlement statuses.
- **Secondary (`#4f46e5` Indigo)**: Designates structural accounts, village nodes, directory ledgers, and identity/admin services.
- **Tertiary (`#e11d48` Rose / Crimson)**: High-priority risk monitor reserved exclusively for outstanding Udhaar, aging defaults, and debit exposure warnings. Paired with an auxiliary Amber (`#d97706`) for pending or unverified slips.
- **Digital Payments (`#7c3aed` Electric Violet)**: Specific accent token applied across PhonePe gateways, dynamic QR generation, webhook webflows, and payment reconciliations.
- **Glass Canvas & Substrates**:
  - Light mode canvas: Ambient off-white base (`#f8fafc`) layered with soft radial gradient orbs (`rgba(79, 70, 229, 0.06)`, `rgba(5, 150, 105, 0.06)`, and `rgba(124, 58, 237, 0.05)`).
  - Surface cards: `rgba(255, 255, 255, 0.72)` supported by a crisp structural perimeter `rgba(255, 255, 255, 0.6)` and deep shadow reflections.

## Typography

Typography pairs **Plus Jakarta Sans** for expressive UI headlines, numeric aggregations, and navigational structures with **JetBrains Mono** for serial slips, transactional timestamps, offline bill hash codes, and UPI reference IDs.

- **Numerics & Financials**: Currency signs (`₹`) and values scale up to prominent weights (`font-weight: 800`) with tight negative tracking (`-0.02em` to `-0.03em`) for punchy legibility against frosted backgrounds.
- **Contextual Legibility**: Data field titles and categorizations leverage uppercase tracking (`letter-spacing: 0.05em`) in `label-xs` to retain visual clarity even over fluctuating mesh background gradients.

## Layout & Spacing

The layout is built upon a dynamic fluid-grid with responsive containment:
- **Desktop (≥ 1280px)**: A 12-column adaptive workspace flanked by either an extruded frosted vertical sidebar or an anchored bottom floating control dock. Section spacing utilizes `space-xl` (36px) gaps to give glass layers room to breathe over glowing gradient meshes.
- **Tablet (768px - 1279px)**: 8-column grid with a fixed `gutter` of 1.25rem. Secondary diagnostic cards transition to 2-column uniform stacks.
- **Mobile (< 768px)**: 4-column layout where metrics cards collapse to swipeable glass cards or uniform full-width tiles. The primary navigation morphs strictly into a floating frosted dock pinned to the safe viewport bottom (`env(safe-area-inset-bottom)` + 12px).

## Elevation & Depth

Visual hierarchy abandons heavy opaque drop shadows in favor of **Refractive Glass Surfaces and Ambient Light Projections**:

- **Layer 0 (Atmosphere Canvas)**: Dynamic fluid backdrop containing multiple oversized blurred radial light bursts (`radial-gradient(circle at 15% 20%, rgba(5, 150, 105, 0.12), transparent 45%)`, `radial-gradient(circle at 85% 60%, rgba(79, 70, 229, 0.10), transparent 50%)`).
- **Layer 1 (Card & Section Glass)**: Background set to `rgba(255, 255, 255, 0.65)` on light mode (`rgba(15, 23, 42, 0.6)` on dark), paired with `backdrop-filter: blur(16px) saturate(180%)`. Border is a crisp inner hairline: `1px solid rgba(255, 255, 255, 0.5)`. Shadow is a feathered ambient spread: `0 8px 32px -4px rgba(15, 23, 42, 0.05)`.
- **Layer 2 (Floating Floating Pill Dock & Overlays)**: Background elevated to `rgba(255, 255, 255, 0.85)` (`backdrop-filter: blur(24px)`), encased with dual shadow: `0 20px 40px -10px rgba(15, 23, 42, 0.12), 0 0 1px 1px rgba(255, 255, 255, 0.8) inset`.
- **Layer 3 (Modals & Command Palettes)**: High-translucency overlay veil (`rgba(15, 23, 42, 0.3) backdrop-blur-md`) with centrally hoisted high-index frosted dialogs.

## Shapes

The design system employs **Rounded (Level 2)** geometry:
- Standard interactive elements, metrics containers, and data cards utilize `rounded-2xl` (16px / 1rem).
- System pills, floating docks, category badges, and quick-action triggers transition into full organic cylinders (`rounded-full` / 9999px).
- Internal nested child panels within glass cards maintain proportional concentric radii (8px–12px) to prevent visual tension.

## Components

### 1. Floating Pill Dock Navigation
- Rendered as an isolated floating capsule elevated 16px above the viewport boundary.
- Container: `bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl rounded-full px-4 py-2.5 flex items-center gap-2`.
- Active items: Gliding pill highlight with slight spring animation, finished with a subtle colored badge indicator and tinted icon glow.

### 2. Glass Stat & Metric Cards
- Surface: Frosted glass container featuring an illuminated corner badge reflecting the functional metric (e.g., emerald for bill counter, indigo for village nodes, rose for credit udhaar balance).
- Typography layout: Micro label top-left, contextual icon top-right nestled inside a tinted translucent circular disc (`bg-emerald-500/10 text-emerald-600`), large tabular amount value centered/bottom with micro-trend indicators.

### 3. Buttons & CTAs
- **Primary Live Billing Button**: `bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-full px-5 py-2.5 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all`.
- **Secondary Glass Button**: `bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/20 text-slate-800 dark:text-white rounded-full px-4 py-2 hover:bg-white/90 backdrop-blur-sm transition-all`.
- **UPI Action Button**: `bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-full shadow-md shadow-purple-600/20`.

### 4. Interactive Ledger Inputs & Search
- Inputs are hollowed translucent wells: `bg-white/40 dark:bg-slate-950/40 border border-white/60 dark:border-white/10 focus:border-emerald-500/60 focus:bg-white/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-2.5 placeholder:text-slate-400 backdrop-blur-sm transition-all`.

### 5. Chips, Status Tags & Ledger Chips
- **Live Counter**: Pill-shaped capsule with a pulsing green inner status dot (`animate-ping`) and high-contrast typography (`bg-emerald-50 text-emerald-700 border border-emerald-200/60`).
- **Udhaar Warning Risk Tag**: Soft rose wash (`bg-rose-50 text-rose-700 border border-rose-200/80 font-bold`).
- **PhonePe Settlement Chip**: Indigo-purple duo gradient micro-pill (`bg-purple-50 text-purple-700 border border-purple-200/60`).

### 6. Village Ledger Tables & Split Slips
- Table headers utilize subtle translucent striping (`bg-slate-100/40 backdrop-blur-sm`).
- Rows incorporate soft hover lifts (`hover:bg-white/60 transition-colors`).
- Monospaced serial tags and balance figures are right-aligned with color coding based on zero-balance (emerald) vs uncollected balance (rose).