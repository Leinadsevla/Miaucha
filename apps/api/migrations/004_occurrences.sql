-- Ocorrências (perdido, avistado, encontrado). `location` é o ponto exato e nunca sai da API;
-- as buscas e as respostas usam só `public_location`, deslocada ~150 m uma única vez na criação (MP-07).
create table occurrences (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users (id) on delete cascade,
  -- Pet do próprio autor, quando ele registra o seu pet como perdido.
  pet_id uuid references pets (id) on delete set null,
  type text not null check (type in ('lost', 'seen', 'found')),
  species text not null check (species in ('dog', 'cat')),
  pet_name text,
  breed text,
  color text,
  description text,
  approx_address text,
  location geography(Point, 4326) not null,
  public_location geography(Point, 4326) not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  -- NF-03: sem atualização há 30 dias = expirada (não aparece nas buscas).
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Busca por raio (ST_DWithin em geography).
create index occurrences_public_location_idx on occurrences using gist (public_location);
-- Busca por bbox: retângulo exato em lat/lng (o && de geography compara caixas no espaço 3D).
create index occurrences_public_location_geom_idx on occurrences using gist ((public_location::geometry));
create index occurrences_author_id_idx on occurrences (author_id, created_at desc);

create table occurrence_photos (
  id uuid primary key,
  occurrence_id uuid not null references occurrences (id) on delete cascade,
  -- Pode ser o mesmo objeto de uma foto do pet (ocorrência criada a partir do pet): não é único aqui.
  object_key text not null,
  content_type text not null,
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

create index occurrence_photos_occurrence_id_idx on occurrence_photos (occurrence_id);

alter table occurrences enable row level security;
alter table occurrence_photos enable row level security;
