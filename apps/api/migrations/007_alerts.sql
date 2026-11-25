-- S5 · Alertas de proximidade. (006 fica reservada para o chat.)

-- AL-06: só a região aproximada do usuário, um geohash de 6 caracteres (~1,2 km × 0,6 km), calculado no app.
-- Uma linha por usuário (só o último geohash, nunca o trajeto) e nenhuma coluna de coordenada.
create table user_locations (
  user_id uuid primary key references users (id) on delete cascade,
  geohash text not null check (geohash ~ '^[0123456789bcdefghjkmnpqrstuvwxyz]{6}$'),
  updated_at timestamptz not null default now()
);

-- Pré-filtro do disparo: a célula de precisão 4 (~39 km × 19 km) do usuário e as vizinhas da ocorrência.
create index user_locations_geohash4_idx on user_locations (left(geohash, 4));

-- AL-04: sem linha = padrão (ligado, 3 km, sem silêncio). Silêncio em minutos desde a meia-noite, hora de São Paulo.
create table alert_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  enabled boolean not null default true,
  radius_km smallint not null default 3 check (radius_km in (1, 3, 5)),
  quiet_start smallint check (quiet_start between 0 and 1439),
  quiet_end smallint check (quiet_end between 0 and 1439),
  updated_at timestamptz not null default now(),
  check ((quiet_start is null) = (quiet_end is null)),
  check (quiet_start is null or quiet_start <> quiet_end)
);

-- Tokens do Expo Push. Um aparelho (token) pertence a uma conta por vez.
create table push_tokens (
  token text primary key,
  user_id uuid not null references users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on push_tokens (user_id);

-- Alertas gerados. AL-05: no máximo um por usuário por ocorrência, garantido pelo banco.
create table alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  occurrence_id uuid not null references occurrences (id) on delete cascade,
  -- Do centro da célula do usuário até o ponto público da ocorrência (aproximada por natureza).
  distance_meters integer not null,
  pushed boolean not null default false,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (user_id, occurrence_id)
);

create index alerts_user_id_idx on alerts (user_id, created_at desc);

alter table user_locations enable row level security;
alter table alert_preferences enable row level security;
alter table push_tokens enable row level security;
alter table alerts enable row level security;
