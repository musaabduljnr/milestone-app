import React from "react";
import { createClient } from "@/lib/supabase/server";
import DisputesClient from "./DisputesClient";

export const revalidate = 0;

export default async function AdminDisputesPage() {
  const supabase = await createClient();

  // Query disputes from database
  const { data: disputes, error } = await supabase
    .from("disputes")
    .select(`
      *,
      project:projects (
        id,
        title,
        client:profiles!client_id(full_name, email)
      ),
      milestone:milestones (
        id,
        title,
        payout_amount,
        freelancer:profiles!assigned_freelancer_id(full_name, email)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to query disputes:", error);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          Payment Dispute Resolution
        </h1>
        <p className="text-body-sm text-secondary">
          Arbitrate payment disputes, refund clients, or release held escrow payouts to freelancers.
        </p>
      </div>

      <DisputesClient disputes={disputes || []} />
    </div>
  );
}
