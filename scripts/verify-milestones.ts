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

// Global clients
const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

// Helper to generate random emails
const rand = () => Math.floor(Math.random() * 1000000);
const clientEmail = `client_${rand()}@test.com`;
const freelancerEmail = `freelancer_${rand()}@test.com`;
const wrongFreelancerEmail = `wrong_freelancer_${rand()}@test.com`;
const testPassword = "Password123!";

async function runTests() {
  console.log("=== PHASE 4B MILESTONE ENGINE SYSTEM TEST MATRIX ===");
  
  // 1. SIGN UP CLIENT
  console.log(`\nSigning up client: ${clientEmail}...`);
  const clientAuth = await anonClient.auth.signUp({
    email: clientEmail,
    password: testPassword,
    options: { data: { full_name: "Test Client" } }
  });
  
  if (clientAuth.error) throw new Error(`Client signup failed: ${clientAuth.error.message}`);
  const clientId = clientAuth.data.user?.id!;
  
  // Setup Client Client
  const clientClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  await clientClient.auth.setSession({
    access_token: clientAuth.data.session?.access_token!,
    refresh_token: clientAuth.data.session?.refresh_token!
  });

  // Update client profile role
  const { error: clientRoleError } = await clientClient
    .from("profiles")
    .update({ role: "client", verification_status: "verified" })
    .eq("id", clientId);
  if (clientRoleError) throw clientRoleError;

  // 2. SIGN UP FREELANCER
  console.log(`Signing up freelancer: ${freelancerEmail}...`);
  const freelancerAuth = await anonClient.auth.signUp({
    email: freelancerEmail,
    password: testPassword,
    options: { data: { full_name: "Sarah Jenkins (Test)" } }
  });
  if (freelancerAuth.error) throw new Error(`Freelancer signup failed: ${freelancerAuth.error.message}`);
  const freelancerId = freelancerAuth.data.user?.id!;

  const freelancerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  await freelancerClient.auth.setSession({
    access_token: freelancerAuth.data.session?.access_token!,
    refresh_token: freelancerAuth.data.session?.refresh_token!
  });

  // Update freelancer profile role
  const { error: freelancerRoleError } = await freelancerClient
    .from("profiles")
    .update({ role: "freelancer", verification_status: "verified" })
    .eq("id", freelancerId);
  if (freelancerRoleError) throw freelancerRoleError;

  // 3. SIGN UP WRONG FREELANCER
  console.log(`Signing up secondary freelancer: ${wrongFreelancerEmail}...`);
  const wrongAuth = await anonClient.auth.signUp({
    email: wrongFreelancerEmail,
    password: testPassword,
    options: { data: { full_name: "Wrong Freelancer" } }
  });
  const wrongId = wrongAuth.data.user?.id!;

  const wrongClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  await wrongClient.auth.setSession({
    access_token: wrongAuth.data.session?.access_token!,
    refresh_token: wrongAuth.data.session?.refresh_token!
  });

  // Update secondary freelancer profile role
  const { error: wrongRoleError } = await wrongClient
    .from("profiles")
    .update({ role: "freelancer", verification_status: "verified" })
    .eq("id", wrongId);
  if (wrongRoleError) throw wrongRoleError;

  // 4. CLIENT TOP UP
  console.log("\nTopping up Client wallet simulated balance...");
  const { error: topUpError } = await clientClient.rpc("add_simulated_funds", { p_amount: 10000.00 });
  if (topUpError) throw topUpError;

  // 5. CLIENT CREATES PROJECT & MILESTONES
  console.log("Creating project with 2 milestones ($2,000 budget)...");
  const milestonesJson = [
    {
      title: "Phase 1: Architecture",
      description: "Define schemas and routes",
      payout_amount: 1200.00,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_freelancer_id: freelancerId
    },
    {
      title: "Phase 2: Execution",
      description: "Assemble UI views",
      payout_amount: 800.00,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_freelancer_id: freelancerId
    }
  ];

  const { data: projectId, error: createError } = await clientClient.rpc("create_project_with_milestones", {
    p_title: "Automated Milestone Test Contract",
    p_description: "Validating state transitions and wallet allocations",
    p_category: "Development",
    p_budget: 2000.00,
    p_currency: "USD",
    p_expected_completion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    p_milestones: milestonesJson
  });

  if (createError) throw createError;
  console.log(`Project created successfully: ${projectId}`);

  // Fetch milestones
  const { data: milestonesData, error: fetchError } = await clientClient
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("payout_amount", { ascending: false });
  if (fetchError || !milestonesData) throw fetchError || new Error("Failed to load milestones");

  const m1 = milestonesData[0]; // $1200
  const m2 = milestonesData[1]; // $800

  // 6. CLIENT FUNDS PROJECT
  console.log("Funding project contract (allocating escrow)...");
  const { error: fundError } = await clientClient.rpc("fund_project", { p_project_id: projectId });
  if (fundError) throw fundError;
  console.log("Project funded. Escrow HELD ledger records generated.");

  // Fetch wallet state after funding
  const { data: clientWalletBefore } = await clientClient
    .from("wallets")
    .select("*")
    .eq("user_id", clientId)
    .single();

  if (!clientWalletBefore) throw new Error("Client wallet not found");
  console.log(`Client Available Balance: $${clientWalletBefore.available_balance}, Held in Escrow: $${clientWalletBefore.pending_balance}`);

  const results = {
    t1: false, t2: false, t3: false, t4: false, t5: false,
    t6: false, t7: false, t8: false, t9: false, t10: false,
    t11: false, t12: false, t13: false, t14: false, t15: false,
    t16: false, t17: false, t18: false
  };

  // --- TEST CASES ---

  // Test 5: Invalid NOT_STARTED -> PAID
  try {
    const { error } = await clientClient.rpc("release_milestone_payment", { p_milestone_id: m1.id, p_is_auto_release: false });
    if (!error) throw new Error("Allowed invalid transition: NOT_STARTED -> APPROVED/PAID");
    results.t5 = true;
    console.log("✅ Test 5 Passed: Prevented NOT_STARTED -> PAID");
  } catch (e: any) {
    console.log("❌ Test 5 Failed: " + e.message);
  }

  // Test 8: Wrong freelancer attempts start / submit
  try {
    const { error } = await wrongClient.rpc("start_milestone", { p_milestone_id: m1.id });
    if (!error) throw new Error("Allowed wrong freelancer to start milestone");
    results.t8 = true;
    console.log("✅ Test 8 Passed: Prevented wrong freelancer from starting milestone");
  } catch (e: any) {
    console.log("❌ Test 8 Failed: " + e.message);
  }

  // Test 1: NOT_STARTED -> IN_PROGRESS
  try {
    const { error } = await freelancerClient.rpc("start_milestone", { p_milestone_id: m1.id });
    if (error) throw error;
    
    // Verify status
    const { data: updatedM1 } = await freelancerClient.from("milestones").select("status").eq("id", m1.id).single();
    if (!updatedM1 || updatedM1.status !== "IN_PROGRESS") throw new Error(`Incorrect status: ${updatedM1?.status}`);
    
    results.t1 = true;
    console.log("✅ Test 1 Passed: Successfully transitioned NOT_STARTED -> IN_PROGRESS");
  } catch (e: any) {
    console.log("❌ Test 1 Failed: " + e.message);
  }

  // Test 7: Client attempts submission
  try {
    const { error } = await clientClient.rpc("submit_milestone", { p_milestone_id: m1.id, p_description: "Trying to submit" });
    if (!error) throw new Error("Allowed Client to submit milestone deliverables");
    results.t7 = true;
    console.log("✅ Test 7 Passed: Prevented client from submitting work");
  } catch (e: any) {
    console.log("❌ Test 7 Failed: " + e.message);
  }

  // Test 2: IN_PROGRESS -> SUBMITTED
  try {
    const { error } = await freelancerClient.rpc("submit_milestone", {
      p_milestone_id: m1.id,
      p_description: "Phase 1 schema designs completed."
    });
    if (error) throw error;

    // Verify status and details
    const { data: updatedM1 } = await freelancerClient.from("milestones").select("*").eq("id", m1.id).single();
    if (!updatedM1 || updatedM1.status !== "SUBMITTED" || !updatedM1.submitted_at || updatedM1.submission_description !== "Phase 1 schema designs completed.") {
      throw new Error("Milestone details mismatch after submission");
    }

    results.t2 = true;
    console.log("✅ Test 2 Passed: Successfully transitioned IN_PROGRESS -> SUBMITTED & set submitted_at");
  } catch (e: any) {
    console.log("❌ Test 2 Failed: " + e.message);
  }

  // Test 6: Invalid SUBMITTED -> IN_PROGRESS
  try {
    const { error } = await freelancerClient.rpc("start_milestone", { p_milestone_id: m1.id });
    if (!error) throw new Error("Allowed transition: SUBMITTED -> IN_PROGRESS");
    results.t6 = true;
    console.log("✅ Test 6 Passed: Prevented SUBMITTED -> IN_PROGRESS");
  } catch (e: any) {
    console.log("❌ Test 6 Failed: " + e.message);
  }

  // Test 10: Freelancer attempts manual approval
  try {
    const { error } = await freelancerClient.rpc("release_milestone_payment", { p_milestone_id: m1.id, p_is_auto_release: false });
    if (!error) throw new Error("Allowed freelancer to approve their own milestone");
    results.t10 = true;
    console.log("✅ Test 10 Passed: Prevented freelancer from approving own milestone");
  } catch (e: any) {
    console.log("❌ Test 10 Failed: " + e.message);
  }

  // Test 9 & 3: Client approves submitted milestone & SUBMITTED -> APPROVED -> PAID
  try {
    const { error } = await clientClient.rpc("release_milestone_payment", { p_milestone_id: m1.id, p_is_auto_release: false });
    if (error) throw error;

    // Verify milestone status
    const { data: updatedM1 } = await clientClient.from("milestones").select("status").eq("id", m1.id).single();
    if (!updatedM1 || updatedM1.status !== "PAID") throw new Error(`Status is not PAID: ${updatedM1?.status}`);

    results.t9 = true;
    results.t3 = true;
    console.log("✅ Test 9 & 3 Passed: Client manual approval transitioned SUBMITTED -> APPROVED -> PAID");
  } catch (e: any) {
    console.log("❌ Test 9 & 3 Failed: " + e.message);
  }

  // Test 11: Client approves twice (Idempotency)
  try {
    const { error } = await clientClient.rpc("release_milestone_payment", { p_milestone_id: m1.id, p_is_auto_release: false });
    if (error) throw error; // RPC must return cleanly due to idempotency
    
    results.t11 = true;
    console.log("✅ Test 11 Passed: Manual approval is idempotent");
  } catch (e: any) {
    console.log("❌ Test 11 Failed: " + e.message);
  }

  // Test 16, 17, 18: Wallet consistency & Escrow Ledger Audits
  try {
    const { data: clientWalletAfter } = await clientClient
      .from("wallets")
      .select("*")
      .eq("user_id", clientId)
      .single();

    const { data: freelancerWallet } = await freelancerClient
      .from("wallets")
      .select("*")
      .eq("user_id", freelancerId)
      .single();

    if (!clientWalletAfter || !freelancerWallet) throw new Error("Could not find wallets for verification");

    // Verify client pending balance decreased by 1200
    const expectedClientPending = 2000.00 - 1200.00;
    if (Math.abs(Number(clientWalletAfter.pending_balance) - expectedClientPending) > 0.01) {
      throw new Error(`Client pending balance incorrect: Expected ${expectedClientPending}, got ${clientWalletAfter.pending_balance}`);
    }

    // Verify freelancer available balance increased by 1200
    if (Math.abs(Number(freelancerWallet.available_balance) - 1200.00) > 0.01) {
      throw new Error(`Freelancer available balance incorrect: Expected 1200, got ${freelancerWallet.available_balance}`);
    }

    results.t16 = true;
    results.t17 = true;
    console.log("✅ Test 16 & 17 Passed: Wallet accounts balance correctly reconciled");

    // Verify escrow ledger contains trace logs
    const { data: ledgerEntries } = await clientClient
      .from("escrow_ledger")
      .select("*")
      .eq("milestone_id", m1.id);

    if (!ledgerEntries || ledgerEntries.length === 0) throw new Error("No ledger entries found for milestone");

    // Should have HELD and RELEASED
    const entryTypes = ledgerEntries.map(e => e.entry_type);
    if (!entryTypes.includes("HELD") || !entryTypes.includes("RELEASED")) {
      throw new Error(`Audit logs missing. Found entry types: ${entryTypes.join(",")}`);
    }

    results.t18 = true;
    console.log("✅ Test 18 Passed: Ledger audits contain consistent HELD and RELEASED trails");
  } catch (e: any) {
    console.log("❌ Test 16, 17 or 18 Failed: " + e.message);
  }

  // --- DISPUTE TESTS (Milestone 2) ---

  // Move Milestone 2 to SUBMITTED
  await freelancerClient.rpc("start_milestone", { p_milestone_id: m2.id });
  await freelancerClient.rpc("submit_milestone", { p_milestone_id: m2.id, p_description: "Phase 2 completed." });

  // Test 14: Client opens dispute on milestone 2
  try {
    const { error } = await clientClient.rpc("dispute_milestone", {
      p_milestone_id: m2.id,
      p_reason: "Deliverables are incomplete"
    });
    if (error) throw error;

    const { data: updatedM2 } = await clientClient.from("milestones").select("status").eq("id", m2.id).single();
    if (!updatedM2 || updatedM2.status !== "DISPUTED") throw new Error(`Milestone status is ${updatedM2?.status}, expected DISPUTED`);

    results.t14 = true;
    console.log("✅ Test 14 Passed: Open dispute shifts state to DISPUTED");
  } catch (e: any) {
    console.log("❌ Test 14 Failed: " + e.message);
  }

  // Test 15: Verify disputed milestone cannot be approved / auto-released
  try {
    const { error } = await clientClient.rpc("release_milestone_payment", { p_milestone_id: m2.id, p_is_auto_release: false });
    if (!error) throw new Error("Allowed approval of disputed milestone");
    results.t15 = true;
    console.log("✅ Test 15 Passed: Disputes freeze payment releases");
  } catch (e: any) {
    console.log("❌ Test 15 Failed: " + e.message);
  }

  console.log("\n=== TEST RESULTS SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
}

runTests().catch(err => {
  console.error("Test execution failed with exception:", err);
  process.exit(1);
});
