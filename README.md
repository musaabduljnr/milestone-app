# Milestone

Milestone is a premium, secure, and AI-powered escrow management and collaboration platform designed for modern freelancers and clients. It facilitates trust, automated milestone-based deliverable tracking, secure virtual ledger balances, and structured dispute resolution in an elegant SaaS interface.

---

## Overview

Milestone solves the core challenges of remote contract execution—escrow security, scope alignment, milestone progress verification, and dispute settlement. The platform simulates a complete financial and identity trust layer, supplemented by Google Gemini AI status drafting, automated scope creep monitoring, and milestone generation.

---

## Core Features

- **Project & Workspace Management**: Dedicated dashboards for Clients to fund contracts and track deliverables, and for Freelancers to manage active timelines.
- **Milestone-Based Workflow**: Dynamic phases with step-by-step state machines (`NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `APPROVED`/`PAID`, `DISPUTED`).
- **Simulated Escrow & Wallets**: Atomic locking of project budgets into simulated escrow. Automatic ledger updates on approval or concession to prevent double-spending.
- **Identity Verification (KYC)**: Two-step secure simulated KYC flow (personal details + photo ID document upload) complete with administrator audit logs.
- **AI Milestone Planning**: Instant breakdown of project descriptions into detailed, cost-attributed milestone lists.
- **AI Workflow Assistant**: Automatic status update drafting based on active freelancer milestones.
- **Scope Creep Detection**: AI audits comparing project chats against original contracts to detect unauthorized changes or additional scope demands.
- **Project Messaging & Collaboration**: Real-time project discussion threads with status changes, notification signals, and file upload structures.
- **Timeline & Activity Log**: Universal activity logger compile-aggregating contract creation, assignments, submissions, approvals, escrow deposits, and dispute declarations.
- **Dispute Resolution & Evidence**: Secure filing of contract disputes, allowing evidence file uploads, mutual split agreements, or full concessions.

---

## Tech Stack

- **Framework**: [Next.js 16.3.0 (Turbopack)](https://nextjs.org/)
- **Core Library**: [React 19.2.8](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL + PostgREST)
- **Database Client**: `@supabase/ssr` & `@supabase/supabase-js`
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)

---

## Architecture

- **Next.js App Router**: Optimized folder structure with type-safe server-rendered route controllers and dynamic endpoints.
- **Supabase Authentication**: Secure authentication middleware proxying route access, with a post-login role-selection step (`client` vs. `freelancer`).
- **Row-Level Security (RLS)**: Fine-grained security policies on all database tables and storage objects, restricting data access solely to assigned contract members.
- **Server Actions**: Secure server-side entry points validating parameters and user sessions to execute project updates, identity submissions, and dispute resolution.
- **AI Service Layer**: Configurable AI client supporting Google Gemini, OpenAI, or a local `MockProvider` fallback for development environments.
- **Storage Buckets**: Isolated private buckets (`identity-documents`, `dispute-evidence`) protected by strict RLS path-checking policies.

---

## Project Structure

```
├── app/                  # Next.js App Router routes & client pages
├── components/           # Shared UI components (Layout, verification, milestones, disputes)
├── lib/                  # Services, helpers, and Supabase client configs
├── public/               # Static assets & icons
├── scripts/              # Standalone test & simulation scripts (verify-kyc, verify-milestones)
├── supabase/             # PostgreSQL schema and update migrations
│   ├── functions/        # Database edge functions
│   └── schema.sql        # Core database schema script
├── types/                # Typescript interface declarations
```

---

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure your environment variables**:
   Create a `.env.local` file in the project root containing your Supabase details (see **Environment Variables** section below).

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Environment Variables

Copy the template from `.env.example` into a local file named `.env.local` and fill in the values:

```env
# Supabase Keys
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Provider Configuration
# Supported: 'gemini', 'openai', 'mock'
AI_PROVIDER=mock
AI_API_KEY=your-ai-api-key
# AI_MODEL=gemini-2.5-flash
# AI_TIMEOUT_MS=10000
```

---

## Supabase Setup

### 1. Database Setup Order
To set up a fresh Supabase database instance, run the SQL scripts located in the `supabase/` folder in the following order:

1. **[`schema.sql`](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/supabase/schema.sql)**: Sets up the core database structure (tables, triggers, wallets, and initial seed data) along with RLS policies and verification foundation functions.
2. **[`phase7_collaboration.sql`](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/supabase/phase7_collaboration.sql)**: Sets up collaboration databases, messages, unread notification systems, and associated triggers.
3. **[`phase8_disputes.sql`](file:///c:/Users/Musa%20A.%20Abubakar/Desktop/milestone-app/supabase/phase8_disputes.sql)**: Adds dispute resolution tracking, escrow ledger updates, and private evidence storage RLS policies.

### 2. Storage Setup
The application requires the creation of two private storage buckets:
- **`identity-documents`**: Stores files uploaded during identity verification.
- **`dispute-evidence`**: Stores uploaded dispute evidence files.

Both buckets must be set to **private** (uncheck public access) and have RLS policies applied (as initialized by the migration SQL scripts).

---

## AI Configuration & Mock Fallback

Milestone features integration with Google Gemini and OpenAI. However, to ensure a seamless local development experience without API keys, a **`MockProvider`** is active by default.
- If `AI_PROVIDER` is set to `mock` (or omitted), all AI actions (milestone planning, status updates, scope audits) return simulated responses instantly.
- To connect to live services, set `AI_PROVIDER` to `gemini` or `openai` and provide a valid `AI_API_KEY`.

---

## Code Quality & Verification

Validate the codebase for production readiness by running:

- **ESLint Checks**:
  ```bash
  npm run lint
  ```
- **TypeScript Compiler Checks**:
  ```bash
  npx tsc --noEmit
  ```
- **Next.js Production Build**:
  ```bash
  npm run build
  ```

---

## MVP Status

> [!NOTE]
> Milestone is currently in **MVP (Minimum Viable Product)** status.
> - **Wallet & Escrow**: The financial transaction layer is virtual and simulated using database ledger transactions. No real payment processing (e.g. Stripe, Paystack) is integrated.
> - **Identity Verification**: The KYC workflow is a simulated mock process designed to demonstrate trust flows and admin audits. No live KYC providers are integrated.
