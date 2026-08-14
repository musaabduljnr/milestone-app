import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is already authenticated, forward them to the dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col selection:bg-primary/20 select-none overflow-x-hidden font-sans">
      {/* Background visual graphics */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden z-0 opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-radial from-primary/20 to-transparent blur-[120px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-radial from-secondary/15 to-transparent blur-[100px]" />
      </div>

      {/* Top Header Navigation */}
      <header className="h-20 shrink-0 border-b border-outline-variant/20 flex items-center justify-between px-6 md:px-12 relative z-10 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[32px] text-primary select-none">
            fingerprint
          </span>
          <span className="text-xl font-bold tracking-tight text-on-surface">
            Milestone
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Body content */}
      <main className="flex-1 relative z-10 flex flex-col gap-20 pb-20">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center px-6 pt-16 md:pt-24 flex flex-col gap-6 items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-container/10 border border-primary/15 text-primary text-xs font-semibold uppercase tracking-wider animate-pulse">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>Simulated Escrow Platform</span>
          </div>

          <h1 className="font-bold text-4xl md:text-6xl text-on-surface tracking-tight leading-tight max-w-3xl">
            Secure Escrow. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
              Multi-Freelancer
            </span>{" "}
            Milestones.
          </h1>

          <p className="text-sm md:text-lg text-muted-foreground max-w-xl leading-relaxed mt-2">
            Fund your project upfront, split scope across custom freelancer milestone chains, and release payouts automatically on delivery review. Backed by simulated smart ledger security.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto">
            <Link href="/auth/signup" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-[180px] h-12 text-sm font-semibold">
                Start as Client
              </Button>
            </Link>
            <Link href="/auth/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-[180px] h-12 text-sm font-semibold">
                Join as Freelancer
              </Button>
            </Link>
          </div>
        </section>

        {/* Bento features grid section */}
        <section className="max-w-7xl w-full mx-auto px-6 flex flex-col gap-6">
          <h2 className="text-center font-bold text-2xl md:text-3xl tracking-tight text-on-surface mb-2">
            Engineered for Transparency &amp; Trust
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-surface-container/50 border border-outline-variant/30 backdrop-blur-xs flex flex-col gap-4 hover:border-primary/30 hover:bg-surface-container-high/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-primary-container/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <h3 className="font-semibold text-body-base text-on-surface">Escrow Protection</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Clients fund project budgets upfront. Virtual funds are held securely in milestone escrow contracts and released immediately upon deliverable validation.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-surface-container/50 border border-outline-variant/30 backdrop-blur-xs flex flex-col gap-4 hover:border-primary/30 hover:bg-surface-container-high/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-primary-container/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">network_node</span>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <h3 className="font-semibold text-body-base text-on-surface">Multi-Freelancer Pipelines</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Assign separate project milestones to different freelancers. Budget splits, deadlines, and deliverables are structured cleanly in visual milestone chains.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-surface-container/50 border border-outline-variant/30 backdrop-blur-xs flex flex-col gap-4 hover:border-primary/30 hover:bg-surface-container-high/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-primary-container/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">psychology</span>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <h3 className="font-semibold text-body-base text-on-surface">AI Collaboration Layer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Draft clean project updates, auto-breakdown contracts based on plain text project scopes, and detect work scope creep issues on submit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row Banner */}
        <section className="max-w-5xl w-full mx-auto px-6">
          <div className="rounded-3xl bg-secondary dark:bg-on-secondary-fixed text-white p-8 md:p-12 flex flex-col md:flex-row justify-around items-center gap-8 border border-white/10 text-center relative overflow-hidden">
            {/* background subtle glow */}
            <div className="absolute top-[-50%] right-[-10%] w-64 h-64 rounded-full bg-primary/20 blur-[60px]" />

            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <span className="font-data-mono text-3xl md:text-4xl font-extrabold text-primary-container">
                $14M+
              </span>
              <span className="text-[10px] text-secondary-container uppercase tracking-wider font-semibold">
                Simulated Volume Locked
              </span>
            </div>

            <div className="w-[1px] h-12 bg-white/15 hidden md:block" />

            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <span className="font-data-mono text-3xl md:text-4xl font-extrabold text-primary-container">
                99.8%
              </span>
              <span className="text-[10px] text-secondary-container uppercase tracking-wider font-semibold">
                On-Time Milestone Release
              </span>
            </div>

            <div className="w-[1px] h-12 bg-white/15 hidden md:block" />

            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <span className="font-data-mono text-3xl md:text-4xl font-extrabold text-primary-container">
                2,400+
              </span>
              <span className="text-[10px] text-secondary-container uppercase tracking-wider font-semibold">
                Contractors Assigned
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-outline-variant/15 py-8 text-center text-xs text-muted-foreground mt-auto relative z-10 max-w-7xl w-full mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>© 2026 Milestone Project Escrow App. Built with Google Antigravity.</span>
        <div className="flex gap-6 font-semibold">
          <Link href="/design-system" className="hover:text-primary transition-colors">Design Sandbox</Link>
          <a href="#" className="hover:text-primary transition-colors">Security Rules</a>
          <a href="#" className="hover:text-primary transition-colors">Support FAQ</a>
        </div>
      </footer>
    </div>
  );
}
