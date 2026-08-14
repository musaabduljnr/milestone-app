"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BentoGrid, BentoCard } from "@/components/layout/BentoLayout";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { Progress } from "@/components/ui/Progress";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dialog } from "@/components/ui/Dialog";
import { ProjectCard, ProjectTeamMember } from "@/components/milestone/ProjectCard";
import { MilestoneStepper, MilestoneStep } from "@/components/milestone/MilestoneStepper";
import { WalletCard } from "@/components/milestone/WalletCard";
import { EscrowCard } from "@/components/milestone/EscrowCard";
import { EscrowLedger, Transaction } from "@/components/milestone/EscrowLedger";
import { ActivityTimeline, ActivityItemData } from "@/components/milestone/ActivityTimeline";
import { FileUpload } from "@/components/milestone/FileUpload";
import { AIAssistantCard } from "@/components/milestone/AIAssistantCard";

export default function DesignSystemPage() {
  const [role, setRole] = React.useState<"client" | "freelancer">("client");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<{ name: string; size: string } | null>(null);
  const [isConfirmingRelease, setIsConfirmingRelease] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "tokens" | "primitives" | "product">("all");

  // Mock data configurations
  const mockTeam: ProjectTeamMember[] = [
    { name: "Alexander", initials: "AA" },
    { name: "Sarah Jenkins", initials: "SJ" },
    { name: "Mark Peterson", initials: "MP" },
  ];

  const clientSteps: MilestoneStep[] = [
    { id: "1", title: "Phase 1: Architecture & DB Design", amount: 4500, status: "paid" },
    { id: "2", title: "Phase 2: API integrations", amount: 3500, status: "submitted" },
    { id: "3", title: "Phase 3: Front-End Assembly", amount: 5000, status: "in_progress" },
    { id: "4", title: "Phase 4: Launch & Deploy", amount: 2000, status: "not_started" },
  ];

  const freelancerSteps: MilestoneStep[] = [
    { id: "1", title: "Phase 1: UI Wireframes & Layouts", amount: 2500, status: "paid" },
    { id: "2", title: "Phase 2: Core State Engine", amount: 3500, status: "in_progress" },
    { id: "3", title: "Phase 3: Payout simulations", amount: 4000, status: "not_started" },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: "tx-1",
      date: "Aug 12, 2026",
      projectName: "E-Commerce App Redesign",
      milestoneName: "Phase 1: Architecture",
      type: "Escrow Release",
      status: "completed",
      amount: 4500,
    },
    {
      id: "tx-2",
      date: "Aug 10, 2026",
      projectName: "E-Commerce App Redesign",
      milestoneName: "Phase 2: API Setup",
      type: "Escrow Lock",
      status: "secured",
      amount: -3500,
    },
    {
      id: "tx-3",
      date: "Aug 09, 2026",
      projectName: "NFT Marketplace Integration",
      milestoneName: "Phase 3: Launch",
      type: "Escrow Release",
      status: "processing",
      amount: 6000,
    },
  ];

  const mockActivities: ActivityItemData[] = [
    {
      id: "act-1",
      iconName: "upload_file",
      message: (
        <span>
          <strong className="text-on-surface font-semibold">Sarah Jenkins</strong> uploaded a file:{" "}
          <a href="#" className="text-primary hover:underline font-medium">
            api_specs_v2.pdf
          </a>
        </span>
      ),
      timestamp: "Today, 10:42 AM",
      iconVariant: "primary",
    },
    {
      id: "act-2",
      iconName: "payments",
      message: (
        <span>
          Escrow released for{" "}
          <strong className="text-on-surface font-semibold">Phase 1: Architecture</strong>
        </span>
      ),
      timestamp: "Yesterday, 3:15 PM",
      iconVariant: "secondary",
    },
    {
      id: "act-3",
      iconName: "chat",
      message: (
        <span>
          <strong className="text-on-surface font-semibold">Alexander</strong> commented on{" "}
          <em className="text-secondary font-medium">Phase 2: API integrations</em>: &ldquo;Please check the OAuth payloads.&rdquo;
        </span>
      ),
      timestamp: "Aug 10, 11:20 AM",
      iconVariant: "neutral",
    },
  ];

  const handleConfirmRelease = () => {
    setIsConfirmingRelease(true);
    setTimeout(() => {
      setIsConfirmingRelease(false);
      setIsModalOpen(false);
      alert("Payment Released Successfully (Simulation)!");
    }, 1500);
  };

  return (
    <AppShell activeRole={role} onRoleSwitch={setRole} activeMenuLabel="Overview">
      <div className="flex flex-col gap-8 pb-12">
        {/* Verification Overview Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                Design System Sandbox
              </h1>
              <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
                Visual testing harness validating audited components, spacing scales, and responsive stackings.
              </p>
            </div>
            
            {/* Quick Switch Role Demo */}
            <div className="flex items-center gap-2 p-1.5 bg-surface-container rounded-lg border border-outline-variant/40 shrink-0">
              <button
                onClick={() => setRole("client")}
                className={`px-3 py-1.5 rounded-md font-label-caps text-[10px] font-bold uppercase transition-all ${
                  role === "client" ? "bg-surface text-primary shadow-subtle" : "text-secondary hover:text-foreground"
                }`}
              >
                Client View
              </button>
              <button
                onClick={() => setRole("freelancer")}
                className={`px-3 py-1.5 rounded-md font-label-caps text-[10px] font-bold uppercase transition-all ${
                  role === "freelancer" ? "bg-surface text-primary shadow-subtle" : "text-secondary hover:text-foreground"
                }`}
              >
                Freelancer View
              </button>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-outline-variant gap-6 text-sm font-semibold select-none">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-3 relative transition-colors ${
                activeTab === "all" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-foreground"
              }`}
            >
              All Components
            </button>
            <button
              onClick={() => setActiveTab("tokens")}
              className={`pb-3 relative transition-colors ${
                activeTab === "tokens" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-foreground"
              }`}
            >
              Design Tokens
            </button>
            <button
              onClick={() => setActiveTab("primitives")}
              className={`pb-3 relative transition-colors ${
                activeTab === "primitives" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-foreground"
              }`}
            >
              Primitives &amp; Controls
            </button>
            <button
              onClick={() => setActiveTab("product")}
              className={`pb-3 relative transition-colors ${
                activeTab === "product" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-foreground"
              }`}
            >
              Milestone Modules
            </button>
          </div>
        </div>

        {/* 1. DESIGN TOKENS TAB */}
        {(activeTab === "all" || activeTab === "tokens") && (
          <section className="flex flex-col gap-6">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              1. Color &amp; Typography Tokens
            </h2>
            <BentoGrid>
              {/* Colors Card */}
              <BentoCard span="two-thirds">
                <Card className="p-6 h-full flex flex-col gap-6">
                  <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                    Core Color Palette
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-primary border border-primary/20" />
                      <span className="font-label-caps text-[10px] font-bold">Primary</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#004ac6</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-secondary border border-secondary/20" />
                      <span className="font-label-caps text-[10px] font-bold">Secondary</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#575e70</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-surface-container border border-outline-variant" />
                      <span className="font-label-caps text-[10px] font-bold">Muted</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#edeeef</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-success text-white border border-success/20" />
                      <span className="font-label-caps text-[10px] font-bold">Success</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#006242</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-error text-white border border-error/20" />
                      <span className="font-label-caps text-[10px] font-bold">Error</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#ba1a1a</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-warning text-white border border-warning/20" />
                      <span className="font-label-caps text-[10px] font-bold">Warning</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#eab308</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-surface border border-outline-variant" />
                      <span className="font-label-caps text-[10px] font-bold">Surface</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#ffffff</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-12 w-full rounded bg-background border border-outline-variant" />
                      <span className="font-label-caps text-[10px] font-bold">Background</span>
                      <span className="font-data-mono text-[10px] text-muted-foreground">#f8f9fa</span>
                    </div>
                  </div>
                </Card>
              </BentoCard>

              {/* Typography Card */}
              <BentoCard span="third">
                <Card className="p-6 h-full flex flex-col gap-6">
                  <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                    Typography Samples
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-1">Display Large</span>
                      <h1 className="font-bold text-display-lg-mobile lg:text-3xl leading-none">Milestone</h1>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-1">Headline Medium</span>
                      <h2 className="font-semibold text-headline-md leading-none">Alexander</h2>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block mb-1">Data Mono</span>
                      <p className="font-data-mono text-body-base font-semibold">$14,250.00</p>
                    </div>
                  </div>
                </Card>
              </BentoCard>
            </BentoGrid>
          </section>
        )}

        {/* 2. PRIMITIVES TAB */}
        {(activeTab === "all" || activeTab === "primitives") && (
          <section className="flex flex-col gap-6">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              2. Primitives &amp; Controls
            </h2>
            <BentoGrid>
              {/* Button states */}
              <BentoCard span="half">
                <Card className="p-6 flex flex-col gap-6 h-full">
                  <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                    Button Variants &amp; States
                  </h3>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button variant="primary">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="ai">AI Suggest</Button>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button variant="primary" isLoading>Loading</Button>
                      <Button variant="primary" disabled>Disabled</Button>
                      <Button variant="primary" leftIcon={<span className="material-symbols-outlined">send</span>}>
                        Icon Left
                      </Button>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <IconButton iconName="notifications" ariaLabel="Notifications" variant="primary" />
                      <IconButton iconName="settings" ariaLabel="Settings" variant="secondary" />
                      <IconButton iconName="delete" ariaLabel="Delete" variant="destructive" />
                      <IconButton iconName="search" ariaLabel="Search" variant="ghost" />
                    </div>
                  </div>
                </Card>
              </BentoCard>

              {/* Inputs & form elements */}
              <BentoCard span="half">
                <Card className="p-6 flex flex-col gap-6 h-full">
                  <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                    Form Controls
                  </h3>
                  
                  <div className="flex flex-col gap-4">
                    <Input placeholder="Enter username..." />
                    <Input leftIconName="search" placeholder="Search entries..." />
                    <Input error placeholder="Validation error input..." />
                    <Textarea placeholder="Enter project scope details..." />
                    <Input disabled placeholder="Disabled field..." value="Non-editable value" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Select>
                        <option>Sarah Jenkins (Developer)</option>
                        <option>Mark Peterson (Designer)</option>
                      </Select>
                      <Checkbox label="I accept simulated escrow terms" />
                    </div>
                  </div>
                </Card>
              </BentoCard>

              {/* Textarea, badging, progress */}
              <BentoCard span="full">
                <Card className="p-6 flex flex-col gap-6">
                  <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                    Badging, Progress, &amp; Skeletons
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Badge variants */}
                    <div className="flex flex-col gap-4">
                      <h4 className="font-label-caps text-[10px] text-muted-foreground font-bold">Badge &amp; Avatar Types</h4>
                      <div className="flex gap-2 flex-wrap items-center">
                        <Badge variant="success">Paid</Badge>
                        <Badge variant="info">In Progress</Badge>
                        <Badge variant="error">Submitted</Badge>
                        <Badge variant="warning">Secured</Badge>
                        <Badge variant="neutral">Not Started</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        <Badge variant="success" size="md">Large Success</Badge>
                        <Badge variant="neutral" size="md">Large Neutral</Badge>
                      </div>
                      <div className="flex gap-3 items-center mt-1">
                        <Avatar initials="AA" size="sm" />
                        <Avatar initials="SJ" size="md" />
                        <Avatar initials="MP" size="lg" />
                      </div>
                    </div>

                    {/* Progress indicators */}
                    <div className="flex flex-col gap-4">
                      <h4 className="font-label-caps text-[10px] text-muted-foreground font-bold">Progress Bars</h4>
                      <div className="flex flex-col gap-3">
                        <div>
                          <span className="text-[10px] text-secondary font-semibold">Continuous: 65%</span>
                          <Progress value={65} />
                        </div>
                        <div>
                          <span className="text-[10px] text-secondary font-semibold">Segmented: 2 of 4</span>
                          <Progress segmentsCount={4} activeSegmentIndex={3} />
                        </div>
                      </div>
                    </div>

                    {/* Loading indicators */}
                    <div className="flex flex-col gap-4">
                      <h4 className="font-label-caps text-[10px] text-muted-foreground font-bold">Skeletons &amp; Spinners</h4>
                      <div className="flex items-center gap-4">
                        <Spinner size="md" />
                        <div className="flex-1 flex flex-col gap-2">
                          <Skeleton variant="text" />
                          <Skeleton variant="rectangular" className="h-6 w-full" />
                        </div>
                        <Skeleton variant="circular" className="h-10 w-10" />
                      </div>
                    </div>
                  </div>
                </Card>
              </BentoCard>
            </BentoGrid>
          </section>
        )}

        {/* 3. PRODUCT SPECIFIC COMPONENTS TAB */}
        {(activeTab === "all" || activeTab === "product") && (
          <section className="flex flex-col gap-6">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              3. Milestone Product Modules
            </h2>
            
            {/* Dashboard active components */}
            <BentoGrid>
              {/* Project Card summary */}
              <BentoCard span="full">
                <div className="flex flex-col gap-3">
                  <h4 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                    Project Card Layout
                  </h4>
                  <ProjectCard
                    title="E-Commerce App Redesign"
                    clientName="Fintech Core Group"
                    status="in_progress"
                    budget={15000}
                    progressPercent={75}
                    completedMilestonesCount={2}
                    totalMilestonesCount={4}
                    nextDeadline="Aug 25, 2026"
                    team={mockTeam}
                    onClick={() => setIsModalOpen(true)}
                  />
                  <span className="text-[10px] text-muted-foreground block text-right">
                    💡 Click card above to trigger the Escrow release confirmation modal demonstration.
                  </span>
                </div>
              </BentoCard>

              {/* Stepper overview */}
              <BentoCard span="full">
                <Card className="p-6 flex flex-col gap-6">
                  <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                    Milestone Stepper Timeline (Responsive layout)
                  </h3>
                  <MilestoneStepper steps={role === "client" ? clientSteps : freelancerSteps} />
                </Card>
              </BentoCard>

              {/* Wallet, Escrow, and File upload */}
              <BentoCard span="third">
                <WalletCard
                  availableBalance={role === "client" ? 14250 : 8450}
                  totalEarned={role === "freelancer" ? 24500 : undefined}
                  onDeposit={() => alert("Simulated Deposit Triggered")}
                  onWithdraw={() => alert("Simulated Withdrawal Triggered")}
                />
              </BentoCard>

              <BentoCard span="third">
                <EscrowCard
                  heldAmount={role === "client" ? 8400 : 3500}
                  releasedAmount={role === "client" ? 4500 : 2500}
                  totalBudget={role === "client" ? 15000 : 10000}
                />
              </BentoCard>

              <BentoCard span="third">
                <Card className="p-6 h-full flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                      Verification Upload
                    </h3>
                    <p className="font-body-sm text-xs text-muted-foreground">
                      Mock file uploader matching role signup checkouts.
                    </p>
                  </div>
                  <FileUpload
                    selectedFileName={uploadedFile?.name}
                    selectedFileSize={uploadedFile?.size}
                    onFileSelect={setUploadedFile}
                    onFileRemove={() => setUploadedFile(null)}
                  />
                </Card>
              </BentoCard>

              {/* AI assist panels */}
              <BentoCard span="two-thirds">
                <AIAssistantCard
                  type={role === "client" ? "scope_verification" : "creep_alert"}
                  onAction={() => setIsModalOpen(true)}
                />
              </BentoCard>

              <BentoCard span="third">
                <AIAssistantCard
                  type="milestone_suggest"
                  onAction={() => alert("Applied Suggestions!")}
                />
              </BentoCard>

              {/* Ledger lists */}
              <BentoCard span="two-thirds">
                <EscrowLedger
                  transactions={mockTransactions}
                  onViewFullHistory={() => alert("Navigating to full ledger history")}
                />
              </BentoCard>

              {/* Audit Timelines */}
              <BentoCard span="third">
                <ActivityTimeline activities={mockActivities} />
              </BentoCard>
            </BentoGrid>
          </section>
        )}
      </div>

      {/* Release Escrow Dialog Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Approve Submission &amp; Release Payment"
        size="md"
      >
        <div className="flex flex-col gap-6">
          <div className="p-4 rounded-lg bg-surface-container border border-outline-variant flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-primary">payments</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider leading-none">
                Escrow Payout Release Amount
              </span>
              <span className="font-data-mono text-headline-sm font-bold text-on-surface mt-1">
                $3,500.00
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-body-sm text-body-sm text-secondary">
              You are about to release the payment escrow for <strong className="text-on-surface font-semibold">Phase 2: API integrations</strong> milestone. This action is irreversible once finalized.
            </p>
            <div className="p-4 rounded-lg bg-success-container/15 border border-success/20 flex gap-3">
              <span className="material-symbols-outlined text-success select-none shrink-0">info</span>
              <span className="font-body-sm text-xs text-on-success-container">
                Simulated payouts do not require active network confirmations and resolve immediately inside the ledger context.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-5 h-11 rounded-md font-label-caps text-xs text-secondary border border-outline-variant hover:bg-surface-container transition-colors active:scale-95"
            >
              Cancel
            </button>
            <Button
              variant="primary"
              size="md"
              isLoading={isConfirmingRelease}
              onClick={handleConfirmRelease}
            >
              Release Funds
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
