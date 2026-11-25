create extension if not exists postgis;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pseudonym text not null,
  email text not null,
  password_hash text,
  google_sub text unique,
  email_verified_at timestamptz,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index users_email_key on users (lower(email));

create table email_codes (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now()
);

create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index refresh_tokens_user_id_idx on refresh_tokens (user_id);
