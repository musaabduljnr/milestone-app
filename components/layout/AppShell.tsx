"use client";

import React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { NotificationBell } from "./NotificationBell";

export interface SidebarItem {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}

export interface AppShellProps {
  children: React.ReactNode;
  activeRole: "client" | "freelancer";
  activeMenuLabel?: string;
  userName?: string;
  userEmail?: string;
  userInitials?: string;
  userAvatarUrl?: string;
  onSignOut?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeRole,
  activeMenuLabel = "Overview",
  userName,
  userEmail,
  userInitials,
  userAvatarUrl,
  onSignOut,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { checkAdminSessionAction } = await import("@/app/admin/actions");
        const hasSession = await checkAdminSessionAction();
        setIsAdmin(hasSession);
      } catch (err) {
        console.error("Error checking admin privileges inside AppShell:", err);
      }
    };
    checkAdmin();
  }, []);

  const sidebarItems: SidebarItem[] = [
    { label: "Overview", icon: "dashboard", href: "/dashboard", active: activeMenuLabel === "Overview" },
    { label: "Projects", icon: "folder_open", href: "/projects", active: activeMenuLabel === "Projects" },
    { label: "Milestones", icon: "assignment_turned_in", href: "/milestones", active: activeMenuLabel === "Milestones" },
    { label: "Messages", icon: "chat", href: "/messages", active: activeMenuLabel === "Messages" },
    { label: "Wallet", icon: "payments", href: "/wallet", active: activeMenuLabel === "Wallet" },
    { label: "Activity", icon: "history", href: "/activity", active: activeMenuLabel === "Activity" },
    { label: "Settings", icon: "settings", href: "/settings", active: activeMenuLabel === "Settings" },
  ];

  if (isAdmin) {
    sidebarItems.push({
      label: "Admin Panel",
      icon: "admin_panel_settings",
      href: "/admin",
      active: activeMenuLabel === "Admin Panel",
    });
  }

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-secondary dark:bg-on-secondary-fixed text-white p-6 justify-between select-none">
      {/* Top Section */}
      <div className="flex flex-col gap-8">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2">
          <span className="material-symbols-outlined text-[28px] text-primary-container">
            fingerprint
          </span>
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight">
            Milestone
          </span>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col gap-1.5">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg font-body-sm text-body-sm font-medium transition-all group ${
                item.active
                  ? "bg-primary text-white"
                  : "text-secondary-container hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-colors ${
                  item.active ? "text-white" : "text-secondary-container group-hover:text-white"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-6">

        {/* User Card */}
        <div className="flex flex-col gap-4 border-t border-white/10 pt-5">
          <div className="flex items-center gap-3">
            <Avatar
              src={userAvatarUrl}
              initials={userInitials || (activeRole === "client" ? "AA" : "SJ")}
              size="md"
              className="border-white/20 bg-white/15 text-white ring-2 ring-white/5"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-label-md text-label-md font-bold truncate">
                {userName || (activeRole === "client" ? "Alexander" : "Sarah Jenkins")}
              </span>
              <span className="font-body-sm text-[10px] text-secondary-container font-medium truncate mt-0.5">
                {userEmail || (activeRole === "client" ? "alexander@milestone.co" : "sarah@jenkins.dev")}
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
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
              {/* Fake Search bar */}
              <div className="relative w-64 hidden lg:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none select-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search project milestones..."
                  className="w-full h-9 pl-9 pr-4 rounded-full border border-outline-variant bg-surface-bright text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans text-body-sm"
                />
              </div>

              {/* Action bells */}
              <NotificationBell activeRole={activeRole} />
              <Link href="/settings">
                <IconButton iconName="account_circle" ariaLabel="View profile settings" variant="ghost" size="sm" />
              </Link>
            </div>
          </header>

          {/* Main Body content */}
          <main className="flex-1 overflow-y-auto bg-background p-8">
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
          <div className="flex items-center gap-1">
            <NotificationBell activeRole={activeRole} />
            <Avatar initials={activeRole === "client" ? "AA" : "SJ"} size="sm" />
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
        <main className="flex-1 bg-background p-4 relative z-10">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
