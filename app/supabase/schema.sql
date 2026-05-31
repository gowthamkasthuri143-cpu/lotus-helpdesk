create extension if not exists pgcrypto;

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  department_name text unique not null,
  floor text,
  contact_person text,
  phone text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'user', 'technician')),
  department_id uuid constraint app_users_department_id_fkey references departments(id) on delete set null,
  phone text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  created_by uuid constraint tickets_created_by_fkey references app_users(id) on delete set null,
  department_id uuid constraint tickets_department_id_fkey references departments(id) on delete set null,
  asset_name text,
  asset_number text,
  complaint_type text not null,
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Emergency')),
  description text,
  status text not null default 'Pending' check (status in ('Pending', 'Assigned', 'In Progress', 'Waiting for User', 'Solved', 'Closed')),
  assigned_to uuid constraint tickets_assigned_to_fkey references app_users(id) on delete set null,
  admin_remark text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  solved_at timestamp with time zone,
  closed_at timestamp with time zone
);

create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  comment text not null,
  created_at timestamp with time zone default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  uploaded_by uuid references app_users(id) on delete set null,
  file_url text not null,
  file_name text,
  file_type text,
  created_at timestamp with time zone default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  title text not null,
  message text,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

alter table departments enable row level security;
alter table app_users enable row level security;
alter table tickets enable row level security;
alter table ticket_comments enable row level security;
alter table attachments enable row level security;
alter table notifications enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;
