import React from "react";
import { createClient } from "@/lib/supabase/server";
import VerificationsClient from "./VerificationsClient";

export const revalidate = 0;

export default async function AdminVerificationsPage() {
  const supabase = await createClient();

  // Query users with pending verification
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("verification_status", "pending")
    .order("verification_started_at", { ascending: false });

  if (error) {
    console.error("Failed to query pending verifications:", error);
  }

  // Generate secure signed URLs for photo ID documents
  const usersWithSignedUrls = await Promise.all(
    (users || []).map(async (user) => {
      if (user.photo_id_path) {
        try {
          const { data } = await supabase.storage
            .from("identity-documents")
            .createSignedUrl(user.photo_id_path, 300); // 5 mins expiry
          return { ...user, signedUrl: data?.signedUrl || null };
        } catch (err) {
          console.error("Error generating signed url for user:", user.id, err);
          return { ...user, signedUrl: null };
        }
      }
      return { ...user, signedUrl: null };
    })
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          KYC Identity Verification Audits
        </h1>
        <p className="text-body-sm text-secondary">
          Audit user identity uploads and approve or decline verification statuses.
        </p>
      </div>

      <VerificationsClient pendingUsers={usersWithSignedUrls} />
    </div>
  );
}
