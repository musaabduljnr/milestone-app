-- Milestone Platform — Phase 11 Admin Panels
-- Admin Authorization & Security Layout
-- ==============================================================================

-- 1. Create public.system_admins table
create table if not exists public.system_admins (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create public.system_config table
create table if not exists public.system_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security
alter table public.system_admins enable row level security;
alter table public.system_config enable row level security;

-- 4. Define RLS Policies for system_admins
drop policy if exists "Allow select system_admins for authenticated users" on public.system_admins;
create policy "Allow select system_admins for authenticated users"
  on public.system_admins for select
  using (auth.role() = 'authenticated');

-- Define RLS Policies for system_config
drop policy if exists "Allow select system_config for authenticated users" on public.system_config;
create policy "Allow select system_config for authenticated users"
  on public.system_config for select
  using (auth.role() = 'authenticated');

-- 5. Seed admin list using active developer profiles (for validation testing)
insert into public.system_admins (user_id)
select id from public.profiles
where email in ('freelancer1@yopmail.com', 'client1@yopmail.com', 'admin@milestone.co')
on conflict (user_id) do nothing;

-- 6. Create admin_verify_user RPC function
create or replace function public.admin_verify_user(p_user_id uuid, p_status text)
returns void as $$
begin
  -- Verify the executing user is indeed an administrator
  if not exists (select 1 from public.system_admins where user_id = auth.uid()) then
    raise exception 'Unauthorized: Administrator privileges required.';
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

-- 7. Force PostgREST schema cache reload
notify pgrst, 'reload schema';
