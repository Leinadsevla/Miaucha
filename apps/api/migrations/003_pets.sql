create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  name text not null,
  species text not null check (species in ('dog', 'cat')),
  breed text,
  color text,
  approx_age text,
  created_at timestamptz not null default now()
);

create index pets_owner_id_idx on pets (owner_id);

-- uploaded_at nulo = URL de upload emitida, mas o envio ainda não foi confirmado.
create table pet_photos (
  id uuid primary key,
  pet_id uuid not null references pets (id) on delete cascade,
  object_key text not null unique,
  content_type text not null,
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

create index pet_photos_pet_id_idx on pet_photos (pet_id);

alter table pets enable row level security;
alter table pet_photos enable row level security;
