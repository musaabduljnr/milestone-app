# Milestone Design System

This document outlines the design tokens, style rules, and layout structures reverse-engineered from the imported Google Stitch design.

---

## 1. Brand & Style Guide
The design system of Milestone is rooted in **Corporate Modernism** with an emphasis on **High-Performance Minimalism**. The visual language is optimized for a high-trust platform managing secure escrowed contracts between clients and freelancers.
* **Modular Structure**: Organizes complex project timelines and financial data into a clean, tile-like **Bento-Box layout**.
* **Legibility & Hierarchy**: Uses clean, mathematical spacing scales, contrasting font weights, and a technical tabular typography palette.
* **Depth Narrative**: Relies on **Tonal Layering** (white surfaces against cool-slate light backgrounds) and sharp solid borders (`1px`) instead of heavy diffuse shadows to create a precise "ledger" feel.

---

## 2. Color Palette
The colors conform to an M3-inspired structural schema, optimized for light mode with high-legibility contrast.

### Brand Colors
| Token | Hex Value | Purpose / Usage |
| :--- | :--- | :--- |
| `primary` | `#004ac6` | Primary brand accent, high-priority interactive states |
| `primary-container` | `#2563eb` | Primary button backgrounds, highlighted borders |
| `secondary` | `#575e70` | Secondary links, headers, muted layout accents |
| `secondary-container` | `#d9dff5` | Selected indicators, neutral highlight backdrops |
| `tertiary` | `#006242` | Success branding, finalized milestone indicator |
| `tertiary-container` | `#007d55` | Confidence scores, positive badge fills |

### Surfaces & Backgrounds
| Token | Hex Value | Purpose / Usage |
| :--- | :--- | :--- |
| `background` | `#f8f9fa` | Base application viewport backdrop |
| `surface` | `#f8f9fa` | Top app bars, default navigation layouts |
| `surface-bright` | `#f8f9fa` | Input fields, active canvas elements |
| `surface-dim` | `#d9dadb` | Muted background borders and divider elements |
| `surface-container-lowest` | `#ffffff` | Primary Bento Card backgrounds, modal surfaces |
| `surface-container-low` | `#f3f4f5` | Textarea backdrops, inactive list states |
| `surface-container` | `#edeeef` | Navigation backdrops, card header sections |
| `surface-container-high` | `#e7e8e9` | Table hover rows, progress tracks |
| `surface-container-highest` | `#e1e3e4` | Dividers, inactive badge backgrounds |

### Text & Outlines
| Token | Hex Value | Purpose / Usage |
| :--- | :--- | :--- |
| `on-background` | `#191c1d` | Dominant text color on main canvas |
| `on-surface` | `#191c1d` | Primary header and body text on white cards |
| `on-surface-variant` | `#434655` | Secondary text, helper labels, placeholders |
| `outline` | `#737686` | Standard borders, checkbox/radio bounds |
| `outline-variant` | `#c3c6d7` | Muted division lines, card outline borders |
| `on-primary` | `#ffffff` | Label text inside primary buttons |

### Status Indicators (Semantic)
| Status | Hex Value | Purpose / Usage |
| :--- | :--- | :--- |
| `error` | `#ba1a1a` | Alert tags, countdown warnings, delete CTAs |
| `error-container` | `#ffdad6` | Overdue milestone warnings, critical alerts |
| `success` (Tertiary) | `#006242` | Funded stages, paid status badges |
| `warning` | `#bdffdb` (Low opacity bg) | AI Suggestion tags, confidence match badges |

---

## 3. Typography
Milestone uses **Geist** for technical swiss-style branding and **JetBrains Mono** / **Geist Mono** for financial data and ledger representation.

| Token | Family | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-lg` | Geist | `48px` | Bold (`700`) | `56px` | `-0.04em` |
| `display-lg-mobile`| Geist | `32px` | Bold (`700`) | `40px` | `-0.02em` |
| `headline-lg` | Geist | `32px` | Semibold (`600`) | `40px` | `-0.01em` |
| `headline-md` | Geist | `24px` | Semibold (`600`) | `32px` | `-0.02em` |
| `headline-sm` | Geist | `20px` | Semibold (`600`) | `28px` | `0em` |
| `body-lg` | Geist | `18px` | Normal (`400`) | `28px` | `0em` |
| `body-base` | Geist | `16px` | Normal (`400`) | `24px` | `0em` |
| `body-sm` | Geist | `14px` | Normal (`400`) | `20px` | `0em` |
| `label-caps` | Geist | `12px` | Semibold (`600`) | `16px` | `0.05em` (uppercase) |
| `data-mono` | JetBrains Mono | `14px` | Medium (`500`) | `20px` | `-0.01em` |
| `mono-timer` | Geist Mono | `24px` | Bold (`700`) | `32px` | `0.02em` |

---

## 4. Spacing Scale
The layout adheres to a `4px` base unit.

* **Layout Padding**: `24px` (`p-container-padding` or `p-gutter`)
* **Page Outer Margins**: `32px` (`container-margin`)
* **Section Gap**: `48px` (`section-gap`)
* **Gutter (Grid Gaps)**: `16px` (Mobile) / `24px` (Desktop)
* **Card Internal Padding**: `24px` (`card-padding`)
* **Text / Form Field Gap**: `8px` (`base`)

---

## 5. Border Radius
Softens the structural grid layout:

* **Button / Input Fields**: `0.25rem` (`4px` DEFAULT in Tailwind) or `0.5rem` (`8px` lg in Tailwind)
* **Bento Cards**: `0.5rem` (`8px` lg in Tailwind) or `0.75rem` (`12px` xl in Tailwind)
* **Badges / Tags**: Fully rounded (`9999px` full)
* **Avatar Rings**: Fully rounded (`9999px` full)

> [!WARNING]
> There is a design token inconsistency between the written design guidelines (which specify a `16px` card radius and `8px` button/input radius) and the compiled code classes (`lg: 8px` and `xl: 12px` border-radius defaults). See the Consistency Audit for normalization recommendations.

---

## 6. Shadows & Depth (Elevation)
Elevation is achieved using sharp outlines and soft light reflections:
* **Background (Level 0)**: `#f8f9fa` (Flat canvas)
* **Cards/Modules (Level 1)**: `#ffffff` surface, with a `1px` solid outline in `outline-variant` (`#c3c6d7`).
* **Overlays/Dropdowns/Modals (Level 2)**: White surface, dark outline, and a soft shadow:
  * CSS: `box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05)`
* **AI Glow / Shimmer**: A special gradient pulse reserved for AI suggestions and generators to make them look distinct.

---

## 7. Layout Infrastructure
The desktop web application employs a structured two-pane dashboard structure:
* **Left Navigation Sidebar**: `280px` fixed width, full viewport height (`h-screen`), dark blue background (`#565e74`/`#131b2e`).
* **Top Header Bar**: `h-16` (64px) fixed height, sticky top, with borders and inline searches.
* **Content Canvas**: Fills remainder of width (`calc(100% - 280px)`), max-width `7xl` (`1280px` container), centered with `32px` page margins.
* **Mobile Layout**: Collapses the Sidebar into a top menu bar, switching layout margins to `16px` or `24px`.
