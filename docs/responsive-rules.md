# Responsive Design Rules

This document details the responsive rules and layout transformations required to adapt the Milestone web application from desktop mockups to tablet and mobile viewports.

---

## 1. Breakpoint Grid System

| Viewport Category | Width Threshold | Sidebar Navigation | Central Container | Gutter / Gap |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop** | `1280px`+ | Fixed sidebar (`280px`) | Max-width `7xl` (`1280px`), centered | `24px` (`gutter`) |
| **Tablet** | `768px` to `1024px` | Fixed sidebar (`280px` or collapsible) | Full width, `24px` side margins | `24px` (`gutter`) |
| **Mobile** | Screen `< 768px` | Hidden (Burger toggle active) | Full width, `16px` side margins | `16px` (`gutter`) |

---

## 2. Navigational Adaptations
* **Desktop & Tablet**: The Left Navigation Sidebar remains sticky on the left side of the screen (`fixed left-0 top-0 h-screen w-[280px]`). The Main Content offsets this via margin (`ml-[280px]`).
* **Mobile**: The sidebar navigation is completely hidden (`hidden md:flex`). It collapses into a burger drawer menu toggled from the TopAppBar. The TopAppBar shifts to full width (`width: 100%`) with no margin offset.

---

## 3. Screen Stacking & Grid Transformations

### Client & Freelancer Dashboard
* **Desktop**: 4-column layout metrics (`grid-cols-4`). Split content layout: Active Projects Table (8 columns) on left, Wallet Overview + AI Assistant (4 columns) on right.
* **Tablet**: Metrics collapse to 2x2 grid (`grid-cols-2`). Content layout stacks: table goes full width (`col-span-12`), wallet and AI panels stack below it.
* **Mobile**: Metrics stack to 1 column (`grid-cols-1`). The Active Projects table has horizontal overflow scrolling (`overflow-x-auto`) to prevent layout clipping.

### Project Detail (Timeline Stepper)
* **Desktop**: The milestone stepper displays horizontally (`flex-row` with a horizontal connector line `w-full h-0.5`).
* **Mobile**: The stepper switches to vertical (`flex-col`). The horizontal line transforms into a vertical left border timeline (`border-l-2 pl-6 pb-4`). Status badges adjust below titles.

### Milestone Detail (Freelancer Submit Page)
* **Desktop**: 12-column grid. Left side: Requirements & ERD normalizations (7 columns). Right side: Work submission form or auto-release timer (5 columns).
* **Tablet & Mobile**: Left and right panels stack vertically (`col-span-12`). The upload submission form stacks below the requirements list so freelancers can reference requirements while submitting.

### Create Project (Milestone Editor)
* **Desktop**: Split view. Left side: Milestone Form (flexible column). Right side: budget allocation sticky card (`w-[360px]`).
* **Tablet/Mobile**: Summary budget card stacks at the top to let clients inspect allocation progress, with form fields stacking below. The action footer remains sticky at the bottom of the device viewport (`sticky bottom-0`).

---

## 4. Touch Targets & Inputs on Mobile
To ensure compliance with mobile accessibility guidelines:
* **Interactive Elements**: All button and input elements must maintain a minimum touch target height of `48px` (`touch-target-min: 44px`).
* **File Upload Zone**: Dashed upload drop zones must support click-to-trigger inputs with a minimum height of `120px` to make tapping simple on mobile viewports.
* **Input Fields**: Focus rings expand from `1px` to `2px` with a transition duration of `150ms`. Textarea fields must lock vertical resizing on mobile screens.
