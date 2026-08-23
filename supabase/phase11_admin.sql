-- Milestone Platform — Phase 11 Admin Panels (Decoupled Authentication Migration)
-- Admin Authorization, Security Layout, and Custom Session Management
-- ==============================================================================

-- Drop old system_admins table if it exists (cascade references)
drop table if exists public.system_admins cascade;
drop table if exists public.admin_sessions cascade;

-- 1. Create public.system_admins table (decoupled from profiles)
create table public.system_admins (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  full_name text not null,
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create public.admin_sessions table for custom admin sessions
create table public.admin_sessions (
  token uuid default gen_random_uuid() primary key,
  admin_id uuid references public.system_admins(id) on delete cascade not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create public.system_config table if not exists
create table if not exists public.system_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.system_admins enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.system_config enable row level security;

-- Define RLS Policies for system_config (Allow select for authenticated platform users to check config)
drop policy if exists "Allow select system_config for authenticated users" on public.system_config;
create policy "Allow select system_config for authenticated users"
  on public.system_config for select
  using (auth.role() = 'authenticated');

-- Note: No SELECT/INSERT/UPDATE/DELETE policies are defined for system_admins or admin_sessions.
-- This ensures all direct API/anonymous REST access is completely blocked (denied by default).
-- Access is granted exclusively via the SECURITY DEFINER functions below.

-- 5. Create RPC: is_admin_setup_required
-- Checks if the system_admins table is empty.
create or replace function public.is_admin_setup_required()
returns boolean as $$
begin
  return not exists (select 1 from public.system_admins limit 1);
end;
$$ language plpgsql security definer;

-- 6. Create RPC: register_first_admin
-- Registers the first admin when the table is empty and returns a valid session token.
create or replace function public.register_first_admin(
  p_email text,
  p_full_name text,
  p_password_hash text
)
returns uuid as $$
declare
  v_admin_id uuid;
  v_token uuid;
begin
  -- Guard: only allow when no admins exist yet
  if exists (select 1 from public.system_admins limit 1) then
    raise exception 'Admin account already initialized. Contact an existing administrator.';
  end if;

  insert into public.system_admins (email, full_name, password_hash)
  values (lower(p_email), p_full_name, p_password_hash)
  returning id into v_admin_id;

  insert into public.admin_sessions (admin_id, expires_at)
  values (v_admin_id, now() + interval '1 day')
  returning token into v_token;

  return v_token;
end;
$$ language plpgsql security definer;

-- 7. Create RPC: get_admin_by_email
-- Retrieves admin credentials by email for server-side auth checking.
create or replace function public.get_admin_by_email(p_email text)
returns table (
  id uuid,
  email text,
  full_name text,
  password_hash text
) as $$
begin
  return query
  select sa.id, sa.email, sa.full_name, sa.password_hash
  from public.system_admins sa
  where sa.email = lower(p_email);
end;
$$ language plpgsql security definer;

-- 8. Create RPC: create_admin_session
-- Creates a session for an authenticated administrator.
create or replace function public.create_admin_session(p_admin_id uuid)
returns uuid as $$
declare
  v_token uuid;
begin
  insert into public.admin_sessions (admin_id, expires_at)
  values (p_admin_id, now() + interval '1 day')
  returning token into v_token;

  return v_token;
end;
$$ language plpgsql security definer;

-- 9. Create RPC: validate_admin_session
-- Validates session token. If valid and not expired, returns admin profile.
create or replace function public.validate_admin_session(p_token uuid)
returns table (
  admin_id uuid,
  email text,
  full_name text
) as $$
begin
  -- House-keeping: delete expired sessions
  delete from public.admin_sessions where expires_at < now();

  return query
  select sa.id, sa.email, sa.full_name
  from public.admin_sessions s
  join public.system_admins sa on s.admin_id = sa.id
  where s.token = p_token and s.expires_at > now();
end;
$$ language plpgsql security definer;

-- 10. Create RPC: delete_admin_session
-- Deletes a session token on logout.
create or replace function public.delete_admin_session(p_token uuid)
returns void as $$
begin
  delete from public.admin_sessions where token = p_token;
end;
$$ language plpgsql security definer;

-- 11. Re-define RPC: admin_verify_user (Session Protected)
-- Verifies a platform user KYC status, checking the admin token.
create or replace function public.admin_verify_user(
  p_user_id uuid, 
  p_status text,
  p_admin_token uuid
)
returns void as $$
begin
  -- Validate the admin token
  if not exists (
    select 1 
    from public.admin_sessions 
    where token = p_admin_token and expires_at > now()
  ) then
    raise exception 'Unauthorized: Invalid or expired administrator session.';
  end if;

  if p_status not in ('pending', 'verified') then
    raise exception 'Invalid verification status: %', p_status;
  end if;

  -- Set session config to bypass RLS/trigger constraint
  perform set_config('app.performing_verification', 'true', true);

  update public.profiles
  set verification_status = p_status,
      verification_verified_at = case when p_status = 'verified' then now() else null end,
      updated_at = now()
  where id = p_user_id;

  -- Add to audit log
  insert into public.verification_audit_log (user_id, action, document_path)
  select p_user_id, 
         case when p_status = 'verified' then 'COMPLETED'::text else 'FAILED'::text end,
         photo_id_path
  from public.profiles
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- 12. Re-define RPC: resolve_dispute_secure (Session Protected)
-- Performs dispute resolutions under security definer scope, checking the admin token.
create or replace function public.resolve_dispute_secure(
  p_dispute_id uuid,
  p_outcome text, -- 'CLIENT_FAVORED', 'FREELANCER_FAVORED', 'PARTIAL_RESOLUTION'
  p_resolution_note text,
  p_client_amount numeric,
  p_freelancer_amount numeric,
  p_admin_token uuid
)
returns void as $$
declare
  v_dispute record;
  v_milestone record;
  v_project record;
  v_client_id uuid;
  v_freelancer_id uuid;
  v_client_wallet record;
  v_freelancer_wallet record;
  v_total_amount numeric;
  v_admin_id uuid;
begin
  -- Validate the admin token
  select admin_id into v_admin_id
  from public.admin_sessions 
  where token = p_admin_token and expires_at > now();

  if v_admin_id is null then
    raise exception 'Unauthorized: Invalid or expired administrator session.';
  end if;

  -- 1. Lock the dispute row
  select * into v_dispute
  from public.disputes
  where id = p_dispute_id
  for update;

  if not found then
    raise exception 'Dispute not found';
  end if;

  if v_dispute.status in ('RESOLVED_CLIENT', 'RESOLVED_FREELANCER', 'CLOSED') then
    raise exception 'Dispute is already resolved';
  end if;

  -- 2. Fetch milestone and project details
  select * into v_milestone
  from public.milestones
  where id = v_dispute.milestone_id;

  select * into v_project
  from public.projects
  where id = v_milestone.project_id;

  v_client_id := v_project.client_id;
  v_freelancer_id := v_milestone.assigned_freelancer_id;

  -- 3. Verify total resolution amounts matches milestone payout
  v_total_amount := p_client_amount + p_freelancer_amount;
  if abs(v_total_amount - v_milestone.payout_amount) > 0.01 then
    raise exception 'Resolution amounts sum (%) must equal milestone payout (%)', v_total_amount, v_milestone.payout_amount;
  end if;

  -- 4. Lock client and freelancer wallets
  select * into v_client_wallet
  from public.wallets
  where user_id = v_client_id
  for update;

  if not found then
    raise exception 'Client wallet not found';
  end if;

  select * into v_freelancer_wallet
  from public.wallets
  where user_id = v_freelancer_id
  for update;

  if not found then
    raise exception 'Freelancer wallet not found';
  end if;

  -- Verify client pending balance has enough held escrow funds
  if v_client_wallet.pending_balance < v_milestone.payout_amount then
    raise exception 'Insufficient escrow balance. Held: %, Required: %', v_client_wallet.pending_balance, v_milestone.payout_amount;
  end if;

  -- 5. Deduct milestone payout from client's pending balance
  update public.wallets
  set pending_balance = pending_balance - v_milestone.payout_amount,
      updated_at = now()
  where user_id = v_client_id;

  -- 6. Add client_amount to client's available balance
  if p_client_amount > 0 then
    update public.wallets
    set available_balance = available_balance + p_client_amount,
        updated_at = now()
    where user_id = v_client_id;

    -- Record REFUNDED entry in escrow ledger
    insert into public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
    values (v_project.id, v_milestone.id, p_client_amount, 'REFUNDED', 'completed');
  end if;

  -- 7. Add freelancer_amount to freelancer's available balance
  if p_freelancer_amount > 0 then
    update public.wallets
    set available_balance = available_balance + p_freelancer_amount,
        updated_at = now()
    where user_id = v_freelancer_id;

    -- Record RELEASED entry in escrow ledger
    insert into public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
    values (v_project.id, v_milestone.id, p_freelancer_amount, 'RELEASED', 'completed');
  end if;

  -- 8. Update milestone status
  if p_freelancer_amount > 0 then
    update public.milestones
    set status = 'PAID',
        paid_at = now(),
        updated_at = now()
    where id = v_milestone.id;
  else
    update public.milestones
    set status = 'NOT_STARTED',
        updated_at = now()
    where id = v_milestone.id;
  end if;

  -- 9. Update dispute status (set resolved_by to NULL as admin is decoupled from platform profiles)
  update public.disputes
  set status = case when p_outcome = 'CLIENT_FAVORED' then 'RESOLVED_CLIENT'
                    when p_outcome = 'FREELANCER_FAVORED' then 'RESOLVED_FREELANCER'
                    else 'CLOSED' end,
      resolution = p_outcome,
      resolution_note = p_resolution_note,
      resolved_by = null,
      resolved_at = now(),
      updated_at = now()
  where id = p_dispute_id;
end;
$$ language plpgsql security definer;

-- 13. Force PostgREST schema cache reload
notify pgrst, 'reload schema';
