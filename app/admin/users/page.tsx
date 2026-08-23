import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const revalidate = 0;

interface UsersPageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const q = params.q || "";
  const role = params.role || "all";
  const status = params.status || "all";

  // Query profiles from database
  let query = supabase
    .from("profiles")
    .select(`
      *,
      project_members (id),
      milestones:milestones!assigned_freelancer_id (id)
    `);

  if (role !== "all") {
    query = query.eq("role", role);
  }
  if (status !== "all") {
    query = query.eq("verification_status", status);
  }

  const { data: users, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to query profiles:", error);
  }

  // Filter client-side for simple text search (name, email)
  const filteredUsers = (users || []).filter((user) => {
    if (!q) return true;
    const nameMatch = (user.full_name || "").toLowerCase().includes(q.toLowerCase());
    const emailMatch = (user.email || "").toLowerCase().includes(q.toLowerCase());
    return nameMatch || emailMatch;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          User Management
        </h1>
        <p className="text-body-sm text-secondary">
          Audit user profiles, roles, activities, and identity verification status.
        </p>
      </div>

      {/* Filter and Search Panel */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form method="GET" action="/admin/users" className="flex flex-col md:flex-row gap-3 w-full">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none select-none">
              search
            </span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search users by name or email..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-body-sm"
            />
          </div>

          {/* Role Filter */}
          <select
            name="role"
            defaultValue={role}
            className="h-10 px-4 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-body-sm"
          >
            <option value="all">All Roles</option>
            <option value="client">Clients Only</option>
            <option value="freelancer">Freelancers Only</option>
          </select>

          {/* Verification Status Filter */}
          <select
            name="status"
            defaultValue={status}
            className="h-10 px-4 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-body-sm"
          >
            <option value="all">All Verifications</option>
            <option value="unverified">Unverified</option>
            <option value="pending">Pending Review</option>
            <option value="verified">Verified</option>
          </select>

          <Button type="submit" variant="primary" className="h-10 text-xs px-5">
            Apply Filters
          </Button>

          {(q || role !== "all" || status !== "all") && (
            <Link href="/admin/users">
              <Button type="button" variant="secondary" className="h-10 text-xs px-4">
                Clear
              </Button>
            </Link>
          )}
        </form>
      </Card>

      {/* Users Tabular View */}
      <Card className="overflow-hidden border border-outline-variant/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant/30 text-caption font-bold text-secondary uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6">User Details</th>
                <th className="p-4">Platform Role</th>
                <th className="p-4">Identity KYC</th>
                <th className="p-4">Created Date</th>
                <th className="p-4">Contracts count</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No users matching criteria were found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container/20 transition-colors">
                    {/* User Identity */}
                    <td className="p-4 pl-6 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {(user.full_name || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-on-surface truncate">
                          {user.full_name || "No Name Provided"}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {user.email || "No Email Provided"}
                        </span>
                      </div>
                    </td>

                    {/* Platform Role */}
                    <td className="p-4">
                      <Badge
                        variant={user.role === "client" ? "info" : "neutral"}
                        className="capitalize font-bold text-[9px] px-2 py-0.5"
                      >
                        {user.role || "Unselected"}
                      </Badge>
                    </td>

                    {/* KYC Verification */}
                    <td className="p-4">
                      <Badge
                        variant={
                          user.verification_status === "verified"
                            ? "success"
                            : user.verification_status === "pending"
                            ? "warning"
                            : "neutral"
                        }
                        className="capitalize font-bold text-[9px] px-2 py-0.5"
                      >
                        {user.verification_status || "Unverified"}
                      </Badge>
                    </td>

                    {/* Joined Date */}
                    <td className="p-4 text-secondary">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Contracts and Milestones */}
                    <td className="p-4 text-secondary">
                      <div className="flex flex-col gap-0.5">
                        <span>{user.project_members?.length || 0} Projects joined</span>
                        {user.role === "freelancer" && (
                          <span className="text-[10px] text-muted-foreground">
                            {user.milestones?.length || 0} Milestones assigned
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      {user.verification_status === "pending" ? (
                        <Link href="/admin/verifications">
                          <Button variant="primary" className="text-[10px] h-7 px-3">
                            Verify KYC
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No Action Needed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
