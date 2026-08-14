import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables manually from .env.local
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const parts = trimmed.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join("=").trim();
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.error("Failed to parse .env.local manually:", err);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase URL or Anon Key. Ensure .env.local is populated.");
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const rand = () => Math.floor(Math.random() * 1000000);
const clientEmail = `client_kyc_${rand()}@test.com`;
const freelancerEmail = `freelancer_kyc_${rand()}@test.com`;
const testPassword = "Password123!";

async function runKycTests() {
  console.log("=== PHASE 5A SIMULATED KYC SECURITY TEST MATRIX ===");

  // 1. SIGN UP CLIENT
  console.log(`\nSigning up Client A: ${clientEmail}...`);
  const clientAuth = await anonClient.auth.signUp({
    email: clientEmail,
    password: testPassword,
    options: { data: { full_name: "Client KYC A" } }
  });
  if (clientAuth.error) throw new Error(`Client signup failed: ${clientAuth.error.message}`);
  const clientId = clientAuth.data.user!.id;
  const clientSessionToken = clientAuth.data.session!.access_token;

  const clientClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  await clientClient.auth.setSession({
    access_token: clientSessionToken,
    refresh_token: clientAuth.data.session!.refresh_token
  });

  // Set Client Role
  const { error: clientRoleError } = await clientClient
    .from("profiles")
    .update({ role: "client" })
    .eq("id", clientId);
  if (clientRoleError) throw clientRoleError;

  // 2. SIGN UP FREELANCER
  console.log(`Signing up Freelancer B: ${freelancerEmail}...`);
  const freelancerAuth = await anonClient.auth.signUp({
    email: freelancerEmail,
    password: testPassword,
    options: { data: { full_name: "Freelancer KYC B" } }
  });
  if (freelancerAuth.error) throw new Error(`Freelancer signup failed: ${freelancerAuth.error.message}`);
  const freelancerId = freelancerAuth.data.user!.id;
  const freelancerSessionToken = freelancerAuth.data.session!.access_token;

  const freelancerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  await freelancerClient.auth.setSession({
    access_token: freelancerSessionToken,
    refresh_token: freelancerAuth.data.session!.refresh_token
  });

  // Set Freelancer Role
  const { error: freelancerRoleError } = await freelancerClient
    .from("profiles")
    .update({ role: "freelancer" })
    .eq("id", freelancerId);
  if (freelancerRoleError) throw freelancerRoleError;

  const results = {
    test1: false, // User can upload own ID
    test2: false, // User cannot upload to another's folder
    test3: false, // User cannot access another's folder
    test4: false, // User cannot set verified directly
    test5: false, // Pending client cannot fund
    test6: false, // Pending freelancer cannot start
    test7: false, // Mock verification lifecycle succeeds
    test8: false, // Verified client can fund
    test9: false, // Verified freelancer can start milestone
    test10: false // Cannot modify another user's verification
  };

  // --- STORAGE TESTS ---
  const testFileContent = "simulated_id_document_payload";
  const clientOwnPath = `${clientId}/passport.txt`;
  const freelancerPath = `${freelancerId}/passport.txt`;

  // Test 1: User can upload their own ID
  try {
    const { error: uploadError } = await clientClient.storage
      .from("identity-documents")
      .upload(clientOwnPath, Buffer.from(testFileContent), { contentType: "text/plain", uppercase: false } as any);

    if (uploadError) throw uploadError;
    results.test1 = true;
    console.log("✅ Test 1 Passed: User uploaded own ID document successfully");
  } catch (e: any) {
    console.log("❌ Test 1 Failed: " + e.message);
  }

  // Test 2: User cannot upload to another user's folder
  try {
    const { error: hackUploadError } = await clientClient.storage
      .from("identity-documents")
      .upload(freelancerPath, Buffer.from("hack_data"), { contentType: "text/plain", uppercase: false } as any);

    if (!hackUploadError) throw new Error("Allowed user A to upload to user B's storage path");
    results.test2 = true;
    console.log("✅ Test 2 Passed: Storage RLS blocked uploading to another user's path");
  } catch (e: any) {
    console.log("❌ Test 2 Failed: " + e.message);
  }

  // Test 3: User cannot read another user's identity document
  try {
    const { data: hackData, error: hackReadError } = await clientClient.storage
      .from("identity-documents")
      .download(freelancerPath);

    // If hackReadError exists, read was blocked
    if (!hackReadError && hackData) throw new Error("Allowed user A to read user B's identity documents");
    results.test3 = true;
    console.log("✅ Test 3 Passed: Storage RLS blocked reading another user's document");
  } catch (e: any) {
    console.log("❌ Test 3 Failed: " + e.message);
  }

  // --- DATABASE RLS / TRIGGER TESTS ---

  // Test 4: User cannot set themselves to verified directly (enforced via database trigger)
  try {
    const { error: hackUpdateError } = await clientClient
      .from("profiles")
      .update({ verification_status: "verified" })
      .eq("id", clientId);

    if (!hackUpdateError) throw new Error("Trigger bypassed! Allowed direct update to verified status.");
    results.test4 = true;
    console.log("✅ Test 4 Passed: Trigger blocked direct update of verification_status to 'verified'");
  } catch (e: any) {
    console.log("❌ Test 4 Failed: " + e.message);
  }

  // Test 10: User cannot modify another user's verification status
  try {
    const { error: hackOtherError } = await clientClient
      .from("profiles")
      .update({ verification_status: "verified" })
      .eq("id", freelancerId);

    if (!hackOtherError) throw new Error("Allowed client to modify freelancer's profile status");
    results.test10 = true;
    console.log("✅ Test 10 Passed: Blocked updating another user's verification status");
  } catch (e: any) {
    console.log("❌ Test 10 Failed: " + e.message);
  }

  // --- FINANCIAL ACCESS CONTROL TESTS (PENDING STATE) ---

  // Client A tops up wallet
  await clientClient.rpc("add_simulated_funds", { p_amount: 5000.00 });

  // Create project draft
  const milestonesJson = [
    { title: "Stage A", description: "Design phase", payout_amount: 1000.00, deadline: new Date(Date.now() + 5*24*60*60*1000).toISOString(), assigned_freelancer_id: freelancerId },
    { title: "Stage B", description: "Code phase", payout_amount: 1000.00, deadline: new Date(Date.now() + 10*24*60*60*1000).toISOString(), assigned_freelancer_id: freelancerId }
  ];

  const { data: projectId } = await clientClient.rpc("create_project_with_milestones", {
    p_title: "KYC Restricted Project",
    p_description: "Checking access controls",
    p_category: "Development",
    p_budget: 2000.00,
    p_currency: "USD",
    p_expected_completion: new Date(Date.now() + 20*24*60*60*1000).toISOString().split('T')[0],
    p_milestones: milestonesJson
  });

  // Test 5: Pending client cannot fund project
  try {
    const { error: pendingFundError } = await clientClient.rpc("fund_project", { p_project_id: projectId });
    if (!pendingFundError) throw new Error("Allowed client with PENDING status to fund project escrow");
    results.test5 = true;
    console.log("✅ Test 5 Passed: Blocked pending client from funding project");
  } catch (e: any) {
    console.log("❌ Test 5 Failed: " + e.message);
  }

  // Test 6: Pending freelancer cannot start milestone
  // (We need to fund the project using a verified client to test freelancer. We will verify the client first)
  
  // --- RUNNING VERIFICATION WORKFLOWS ---

  // Test 7: Mock verification lifecycle transitions to verified successfully
  try {
    // Step 1: Save details
    const { error: saveError } = await clientClient
      .from("profiles")
      .update({ date_of_birth: "1990-01-01", photo_id_path: clientOwnPath })
      .eq("id", clientId);
    if (saveError) throw saveError;

    // Step 2: Start Mock Verification RPC
    const { error: startKycError } = await clientClient.rpc("start_mock_verification");
    if (startKycError) throw startKycError;

    // Check status is pending
    const { data: pendingProfile } = await clientClient.from("profiles").select("verification_status").eq("id", clientId).single();
    if (!pendingProfile || pendingProfile.verification_status !== "pending") throw new Error("Incorrect status after starting verification: " + pendingProfile?.verification_status);

    // Step 3: Complete Mock Verification RPC
    const { error: completeKycError } = await clientClient.rpc("complete_mock_verification");
    if (completeKycError) throw completeKycError;

    // Check status is verified
    const { data: verifiedProfile } = await clientClient.from("profiles").select("verification_status").eq("id", clientId).single();
    if (!verifiedProfile || verifiedProfile.verification_status !== "verified") throw new Error("Failed to transition to verified");

    results.test7 = true;
    console.log("✅ Test 7 Passed: Mock verification lifecycle transitioned pending -> verified successfully");
  } catch (e: any) {
    console.log("❌ Test 7 Failed: " + e.message);
  }

  // Verify Freelancer B too
  await freelancerClient.from("profiles").update({ date_of_birth: "1992-05-12", photo_id_path: freelancerPath }).eq("id", freelancerId);
  await freelancerClient.rpc("start_mock_verification");

  // Test 6 check: Freelancer B is pending. Try to start milestone.
  // Wait, first Client A (now verified) funds the project!
  console.log("\nVerified Client A funding project contract...");
  const { error: verifiedFundError } = await clientClient.rpc("fund_project", { p_project_id: projectId });
  if (verifiedFundError) throw verifiedFundError;
  results.test8 = true;
  console.log("✅ Test 8 Passed: Verified Client successfully funded project");

  const { data: milestones } = await clientClient.from("milestones").select("id").eq("project_id", projectId);
  if (!milestones || milestones.length === 0) throw new Error("Milestones not found");
  const m1_id = milestones[0].id;

  // Freelancer B tries to start milestone while pending
  try {
    const { error: pendingStartError } = await freelancerClient.rpc("start_milestone", { p_milestone_id: m1_id });
    if (!pendingStartError) throw new Error("Allowed pending freelancer to start milestone");
    results.test6 = true;
    console.log("✅ Test 6 Passed: Blocked pending freelancer from starting milestone");
  } catch (e: any) {
    console.log("❌ Test 6 Failed: " + e.message);
  }

  // Complete freelancer B verification
  await freelancerClient.rpc("complete_mock_verification");

  // Test 9: Verified freelancer B starts milestone
  try {
    const { error: verifiedStartError } = await freelancerClient.rpc("start_milestone", { p_milestone_id: m1_id });
    if (verifiedStartError) throw verifiedStartError;

    const { data: m1 } = await freelancerClient.from("milestones").select("status").eq("id", m1_id).single();
    if (!m1 || m1.status !== "IN_PROGRESS") throw new Error(`Incorrect milestone status: ${m1?.status}`);

    results.test9 = true;
    console.log("✅ Test 9 Passed: Verified freelancer starts milestone successfully");
  } catch (e: any) {
    console.log("❌ Test 9 Failed: " + e.message);
  }

  console.log("\n=== TEST RESULTS SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
}

runKycTests().catch(err => {
  console.error("KYC tests execution failed:", err);
  process.exit(1);
});
