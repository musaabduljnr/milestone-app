"use client";

import React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";

export interface AdminSidebarItem {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}

export interface AdminShellProps {
  children: React.ReactNode;
  activeMenuLabel?: string;
  userName?: string;
  userEmail?: string;
  userInitials?: string;
  userAvatarUrl?: string;
  onSignOut?: () => void;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  children,
  activeMenuLabel = "Overview Dashboard",
  userName,
  userEmail,
  userInitials,
  userAvatarUrl,
  onSignOut,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const sidebarItems: AdminSidebarItem[] = [
    { label: "Overview", icon: "analytics", href: "/admin", active: activeMenuLabel === "Overview Dashboard" },
    { label: "User Management", icon: "group", href: "/admin/users", active: activeMenuLabel === "User Management" },
    { label: "Projects", icon: "folder_open", href: "/admin/projects", active: activeMenuLabel === "Project Audits" },
    { label: "Milestones", icon: "assignment_turned_in", href: "/admin/milestones", active: activeMenuLabel === "Milestone Audits" },
    { label: "Disputes Queue", icon: "gavel", href: "/admin/disputes", active: activeMenuLabel === "Dispute Resolution" },
    { label: "Verification Audits", icon: "verified_user", href: "/admin/verifications", active: activeMenuLabel === "Verification Audits" },
    { label: "Project Invitations", icon: "mail", href: "/admin/invitations", active: activeMenuLabel === "Project Invitations" },
    { label: "Platform Activity", icon: "history", href: "/admin/activity", active: activeMenuLabel === "Platform Activity" },
    { label: "AI Controller", icon: "smart_toy", href: "/admin/ai", active: activeMenuLabel === "AI Controller" },
    { label: "Platform Settings", icon: "settings", href: "/admin/settings", active: activeMenuLabel === "Platform Settings" },
    { label: "Exit Admin Mode", icon: "arrow_back", href: "/dashboard", active: false },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1c1b1f] text-[#e6e1e5] p-6 justify-between select-none">
      {/* Top Section */}
      <div className="flex flex-col gap-6 overflow-y-auto max-h-[80vh] scrollbar-thin">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2 shrink-0">
          <span className="material-symbols-outlined text-[28px] text-[#cfbcff]">
            admin_panel_settings
          </span>
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
            Milestone Operations
          </span>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-2.5 rounded-lg font-body-sm text-body-sm font-medium transition-all group ${
                item.active
                  ? "bg-[#4f378b] text-white"
                  : "text-[#cac4d0] hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-colors ${
                  item.active ? "text-white" : "text-[#cac4d0] group-hover:text-white"
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-4 border-t border-white/10 pt-4 shrink-0">
        {/* User Card */}
        <div className="flex items-center gap-3">
          <Avatar
            src={userAvatarUrl}
            initials={userInitials || "AD"}
            size="md"
            className="border-white/20 bg-white/15 text-white ring-2 ring-white/5"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-label-md text-label-md font-bold truncate text-white">
              {userName || "Platform Admin"}
            </span>
            <span className="font-body-sm text-[10px] text-[#cac4d0] font-medium truncate mt-0.5">
              {userEmail || "admin@milestone.co"}
            </span>
          </div>
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-error/10 hover:bg-error/20 text-error rounded-md text-xs font-semibold uppercase tracking-wider transition-colors w-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfdf7] dark:bg-[#1c1b1f]">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-row h-screen overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[280px] shrink-0 border-r border-outline-variant/35 h-full flex flex-col">
          {renderSidebarContent()}
        </aside>

        {/* Right Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar Header */}
          <header className="h-16 shrink-0 bg-surface border-b border-outline-variant/20 flex items-center justify-between px-8 relative z-20">
            <h2 className="font-headline-sm text-headline-sm font-semibold capitalize text-on-surface">
              {activeMenuLabel}
            </h2>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 text-[10px] font-bold tracking-widest text-[#4f378b] bg-[#e8def8] border border-[#cfbcff] rounded-full uppercase select-none">
                Admin Mode
              </span>
            </div>
          </header>

          {/* Main Body content */}
          <main className="flex-1 overflow-y-auto bg-[#f4f3f6] p-8">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-14 bg-surface border-b border-outline-variant/30 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <IconButton
              iconName={isMobileMenuOpen ? "close" : "menu"}
              ariaLabel="Toggle sidebar menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              variant="ghost"
              size="sm"
            />
            <h1 className="font-headline-sm text-body-base font-bold text-on-surface capitalize">
              {activeMenuLabel}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-[#4f378b] bg-[#e8def8] rounded-full uppercase">
              Admin
            </span>
            <Avatar initials="AD" size="sm" />
          </div>
        </header>

        {/* Sidebar Drawer overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-14 z-40 bg-on-background/30 backdrop-blur-xs flex">
            <div className="w-[280px] h-full animate-in slide-in-from-left duration-200">
              {renderSidebarContent()}
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Mobile Page Canvas Content */}
        <main className="flex-1 bg-[#f4f3f6] p-4 relative z-10">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
