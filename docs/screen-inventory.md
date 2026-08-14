# Screen Inventory Audit

This document audits all 11 screens imported from the Google Stitch design, specifying their roles, routes, visual hierarchies, required data models, and viewport responsive changes.

---

## Screen 1 — AI Assistant & Scope Check
* **Route**: `/client/projects/:projectId/scope` (or as a workspace utility side panel)
* **User Role**: Client / Freelancer (Shared AI-assisted workspace)
* **Purpose**: Provide AI-assisted milestone generation from textual scope descriptions and run scope match checks.
* **Primary CTA**: "Generate Milestones" (for Generator card), "Approve Work" (for Scope check card).
* **Secondary Actions**: "Request Revisions", edit milestone amounts, add/remove requirements.
* **Required Data**: Project Scope description text, Confidence match score (`85%`), Matched requirements list, Items requiring review list.
* **Reusable Components**: [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell), [Button](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#button), [AIAssistantCard](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#ai-project-assistant), [Badge](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#badge--status-pill).
* **Unique Layouts**: AI Gradient pulse loading effects.
* **States**:
  * *Loading*: Shimmer loading bars visible during milestone calculation.
  * *Empty*: Textarea scope is empty, preview panel hidden.
  * *Error*: Invalid scope text triggers validation error.
  * *Success*: "3 Milestones Generated" checklist and amount preview shown.

---

## Screen 2 — Auth & Verification
* **Route**: `/auth` (contains steps `/auth/signup`, `/auth/role-selection`, `/auth/verification`)
* **User Role**: Onboarding Guest / Registered User
* **Purpose**: Linear onboarding wizard guiding users through registration, role assignment (Client vs. Freelancer), and simulated KYC verification.
* **Primary CTA**: "Continue" (step 1 & 2), "Submit Verification" (step 3), "Go to Dashboard" (step 4).
* **Secondary Actions**: Google/Github social signup, "Back" navigation.
* **Required Data**: Full Name, Email, Password, Chosen role, Legal Name, DOB, Photo ID upload, Terms consent.
* **Reusable Components**: [Button](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#button), [Input](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#input--textarea), [FileUpload](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#fileupload).
* **Unique Layouts**: Centered modal wizard box (no layout sidebars/navs).
* **States**:
  * *Loading*: "Verifying..." spinner activates on submitting KYC.
  * *Empty*: Blank fields, upload box inactive, continue button disabled.
  * *Error*: Unchecked terms or empty files disable buttons.
  * *Success*: Step 4: Verification complete success checkmark card.

---

## Screen 3 — Wallet | Simulation
* **Route**: `/wallet`
* **User Role**: Client / Freelancer (Shared View)
* **Purpose**: Overview of financial transactions and simulated wallet operations.
* **Primary CTA**: "Browse Available Projects" (Empty State), "View Full History".
* **Secondary Actions**: "Deposit", "Withdraw".
* **Required Data**: Available balance (`$14,250.00`), Escrow Held (`$8,400.00`), Total Released (`$24,250.00`), transaction table list.
* **Reusable Components**: [WalletCard](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#walletcard), [DataTable](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#transactionledger), [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell).
* **Unique Layouts**: Simulated ledger banner notice.
* **States**:
  * *Loading*: Grid skeletons representing ledger table rows.
  * *Empty*: "Your wallet is empty" panel showing "Browse Available Projects" CTA.
  * *Error*: Insufficient funds warning.
  * *Success*: Status rows show "Completed" (green) or "Secured" (blue).

---

## Screen 4 — Project Detail | Client
* **Route**: `/client/projects/:projectId`
* **User Role**: Client
* **Purpose**: Overview of project scope, budgets, timeline progress, and actions to review deliverables.
* **Primary CTA**: "Review Submission".
* **Secondary Actions**: Navigation links, team member view.
* **Required Data**: Project details, total budget (`$15,000.00`), escrow funds held/released ratio, active milestone status checklist.
* **Reusable Components**: [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell), [PageHeader](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#topappbar), [MilestoneStepper](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#milestonestepper--horizontal-timeline), [ActivityItem](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#activityitem).
* **States**:
  * *Loading*: Component skeletons on initial canvas fetch.
  * *Empty*: Project without stages triggers setup warning.
  * *Success*: Milestones marked as PAID (greenish badges).

---

## Screen 5 — Dashboard | Freelancer
* **Route**: `/freelancer/dashboard`
* **User Role**: Freelancer
* **Purpose**: Overview of earnings, active contracts, and rapid links to submit deliverables.
* **Primary CTA**: "Submit Work" (on soon due card).
* **Secondary Actions**: "View All", "View Full Ledger".
* **Required Data**: Active count (`3`), Due soon count (`1`), Submitted count (`2`), Total Earned (`$12,450.00`), Active list items.
* **Reusable Components**: [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell), [StatCard](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#statcard), [MilestoneCard](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#milestonecard), [TransactionLedger](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#transactionledger).
* **States**:
  * *Loading*: Skeletons on card parameters.
  * *Error*: Red schedule countdown indicators for <48h deadlines.

---

## Screen 6 — Review & Approval | Client
* **Route**: `/client/projects/:projectId/milestones/:milestoneId/review`
* **User Role**: Client
* **Purpose**: Deep inspection of submitted deliverables, letting clients release payments, request revisions, or open disputes.
* **Primary CTA**: "Approve & Release Payment".
* **Secondary Actions**: "Request Changes", "Open Dispute", download attachments.
* **Required Data**: Milestone Name (Frontend Dev - Phase 2), budget amount (`$2,450.00`), freelancer notes, attachments, requirements checklist, auto-approval countdown.
* **Reusable Components**: [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell), [Modal](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#modal), [AttachmentPreview](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#button).
* **States**:
  * *Loading*: Release confirmation loads spinner on release confirms.
  * *Success*: "Milestone Approved" success overlay.

---

## Screen 7 — Create Project | Milestones
* **Route**: `/client/projects/new/milestones`
* **User Role**: Client
* **Purpose**: Allocate total project budgets to individual milestone items with deadlines and assignees.
* **Primary CTA**: "Review & Fund" (disabled until total budget is allocated).
* **Secondary Actions**: "Back", "Add Another Milestone", "Generate milestones with AI".
* **Required Data**: Total Budget (`$5,000.00`), Milestone list array, unallocated remaining budget (`$1,500.00`).
* **Reusable Components**: [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell), [Input](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#input--textarea), [Select](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#select).
* **Unique Layouts**: Budget Allocation progress bar, unallocated warning box.
* **States**:
  * *Error*: Allocated sum exceeding total budget flags red outline.
  * *Success*: Zero unallocated funds enables "Review & Fund" CTA.

---

## Screen 8 — Dashboard | Client
* **Route**: `/client/dashboard`
* **User Role**: Client
* **Purpose**: Core landing view for client users to track all active contracts, verify budgets, and check AI suggestions.
* **Primary CTA**: "Create Project".
* **Secondary Actions**: "Deposit", "Withdraw", "Review Details" (AI creep card).
* **Required Data**: Alexander greeting, metrics, active project lists, wallet balances, AI creep warnings.
* **Reusable Components**: [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell), [StatCard](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#statcard), [DataTable](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#transactionledger).
* **States**:
  * *Empty*: Onboarded user with zero projects sees placeholder card to create.

---

## Screen 9 — Milestone | Landing Page
* **Route**: `/`
* **User Role**: Public Guest
* **Purpose**: Promotional SaaS commercial landing page.
* **Primary CTA**: "Get Started" / "Start a Project".
* **Secondary Actions**: "Work as a Freelancer", navigation clicks.
* **Required Data**: Static landing copy, feature list descriptions, dashboard preview stats.
* **Reusable Components**: [Button](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#button), [Navbar](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#topappbar), [Footer](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell).
* **Unique Layouts**: 3D transform dashboard preview card.

---

## Screen 10 — Milestone Escrow Management Platform (Duplicate)
* **Route**: `/`
* **User Role**: Public Guest
* **Purpose**: Duplicate screen mirroring Screen 9 marketing landing page layout.

---

## Screen 11 — Milestone Detail | Freelancer
* **Route**: `/freelancer/milestones/:milestoneId`
* **User Role**: Freelancer
* **Purpose**: View focused deliverables requirements, check escrow release warnings, and upload milestone work submissions.
* **Primary CTA**: "Submit for Review".
* **Secondary Actions**: "Drag & drop files", "View Submission Details".
* **Required Data**: Milestone Name (Database Architecture), payout amount (`$4,500.00`), due dates, checklist, 72h auto-release alert warnings.
* **Reusable Components**: [AppShell](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#appshell), [FileUpload](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#fileupload), [Input](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/docs/component-inventory.md#input--textarea).
* **States**:
  * *Success*: Work submitted triggers countdown auto-release timer (`71:59:59` animated).
