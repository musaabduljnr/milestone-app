# Component Inventory

This document inventory details all reusable components identified in the Milestone Stitch designs, categorized by functionality and structural layout layers.

---

## 1. Foundation Components

### Button
Interactive CTA actions supporting size and color variants.
* **Properties**: Icon (left/right optional), disabled state, click handlers, loading states.
* **Variants**:
  * `Primary`: `#004ac6` background, `#ffffff` text, hover opacity. Height: `44px` (standard) or `48px` (large).
  * `Secondary`: White background, `outline-variant` border, `#575e70` text.
  * `Tertiary/Ghost`: Muted hover backgrounds, no border, primary color text.
  * `Destructive`: Transparent background, hover background tint, red text (used in Disputes).
  * `AI Generator (Special)`: Glowing shimmer animation overlays, bolt icon.

### Input & Textarea
Data collection bounds for form entries.
* **Properties**: Placeholder, error outline, focus state (2px outline ring, primary color border).
* **Variants**:
  * `Standard Input`: Single line, white background, `outline-variant` border.
  * `Textarea`: Fixed height or resizable, low-opacity container backdrop.
  * `Header Search`: Rounded search input pill with leading search icon.

### Select
Standard dropdown selector for team member assignees.
* **Properties**: Leading label, dropdown arrow indicator, focus rings.

### Checkbox
Tick indicator for identity verification privacy consent.
* **Properties**: Interactive checkbox borders, checked primary color fills.

### Badge / Status Pill
Metadata indicator pills.
* **Properties**: Text status label, low-opacity status color background.
* **Variants**:
  * `PAID / COMPLETED` (Success): Light green bg, dark green text.
  * `SUBMITTED / IN REVIEW` (Accent): Light blue bg, primary blue text.
  * `IN PROGRESS` (Neutral): Light gray bg, secondary text.
  * `NOT STARTED / LOCKED` (Muted): Outlined dashed border, muted gray text.
  * `REQUIRES REVIEW` (Error): Light red bg, dark red text.

### Avatar
Professional profile rendering.
* **Properties**: Group spacing overlaps (`-space-x-2`), circular image clips, ring overlays.
* **Variants**:
  * `Individual`: Header avatar, freelancer profile card.
  * `Stacked Group`: Team indicators on project lists.

### Icon
Monochromatic glyph rendering using Material Symbols Outlined.
* **Properties**: Size, fill weight configurations (FILL 0 vs. FILL 1).

---

## 2. Layout Components

### AppShell
The main interface shell integrating navigation and content viewports.
* **Desktop**: Double pane split with fixed Left Nav Sidebar, sticky TopAppBar, and scrollable right canvas.
* **Mobile**: Sticky TopAppBar menu toggle, full width main canvas.

### Sidebar / SideNavBar
Primary route directory, hidden on viewport sizes `< 768px`.
* **Properties**: Fixed width (`280px`), vertical alignment, logo block, route menu links, help/settings footer buttons.

### TopAppBar
Main application header, offsets desktop sidebar.
* **Properties**: Height `h-16`, search fields, notification bell, profile icon.

### BentoGrid
A 12-column layout grid using `24px` gaps to stack multi-column metric tiles.
* **Properties**: Flex/Grid columns, viewport responsive columns (Desktop: 12-columns, Tablet: 2-columns, Mobile: 1-column).

---

## 3. Data Display Components

### StatCard
Metric bento card representing overview statistics.
* **Properties**: Icon container, uppercase metric label caps, bold numeric display, hover borders.

### WalletCard
Simulated wallet asset indicator.
* **Properties**: Blue-gradient background, large currency font, total earned stats subtext, action links.

### MilestoneStepper / Horizontal Timeline
Horizontal progressive stepper mapping stages of project milestones.
* **Properties**: Interactive states, segment status labels, connector lines.
* **Variants**: Client-review view (focused active reviews), creation preview.

### TransactionLedger
Data table listing financial activities in the simulated environment.
* **Properties**: Rows containing Date, Project, Milestone, Type, Status, and Amount. Tabular fonts.

### ActivityItem
Single row indicator showing project logs.
* **Properties**: Icon category (comment, upload, payment), message text, timestamp subtext.

---

## 4. Overlay Components

### Modal
Confirmation overlay for high-stakes actions like payment release.
* **Properties**: Backdrop blur (`backdrop-blur-sm`), centered container card, header prompt, cancel/confirm actions.

### SuccessOverlay
Full screen overlay notifying action completions (such as successful verify or milestone released).

---

## 5. Form Components

### FileUpload
Dashed file drag-and-drop zone.
* **Properties**: Upload icon, upload subtext descriptions, successful upload tag view, file delete triggers.

---

## 6. Product Components

### AI Milestone Generator
Dynamic text analysis and suggestion preview card.
* **Properties**: Input textarea, generate CTA, milestone card lists (with editable bounds).

### AI Scope Verification
Milestone deliverable verification panel.
* **Properties**: Match confidence score, matched requirements list, "Requires Review" warning checklist, Revision/Approve buttons.

### CountdownCard
A auto-approval countdown timer warning.
* **Properties**: Geist Mono timer numbers, auto-approval remaining warnings, progress progress indicators.
