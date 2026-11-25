-- Chat interno (S4). Conversa sempre ligada a uma ocorrência, entre o autor e outra pessoa (CH-01).
-- As respostas da API mostram só o pseudônimo do outro (CH-02); ids de usuário nunca saem da API.
create table conversations (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references occurrences (id) on delete cascade,
  -- Autor da ocorrência (copiado na criação) e quem puxou conversa.
  author_id uuid not null references users (id) on delete cascade,
  requester_id uuid not null references users (id) on delete cascade,
  -- Opt-in duplo para mostrar o e-mail (CH-07).
  author_contact_consent_at timestamptz,
  requester_contact_consent_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  -- Iniciar é idempotente: o mesmo par na mesma ocorrência é sempre a mesma conversa.
  unique (occurrence_id, requester_id),
  check (author_id <> requester_id)
);

create index conversations_author_id_idx on conversations (author_id);
create index conversations_requester_id_idx on conversations (requester_id);

-- Fotos enviadas no chat: mesmo fluxo de URL assinada e confirmação das fotos de pet (NF-05).
create table chat_photos (
  id uuid primary key,
  conversation_id uuid not null references conversations (id) on delete cascade,
  object_key text not null unique,
  content_type text not null,
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

create index chat_photos_conversation_id_idx on chat_photos (conversation_id);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  -- Ordem estável para o cursor (duas mensagens podem ter o mesmo created_at).
  seq bigint generated always as identity,
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  kind text not null check (kind in ('text', 'photo', 'location')),
  -- Texto já mascarado (CH-06): telefone, e-mail e link nunca chegam ao banco.
  body text,
  photo_id uuid unique references chat_photos (id) on delete set null,
  -- Só o ponto aproximado (~150 m do real, CH-05); o exato nunca chega ao banco.
  location geography(Point, 4326),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (
    (kind = 'text' and body is not null) or
    (kind = 'photo') or
    (kind = 'location' and location is not null)
  )
);

create index chat_messages_conversation_seq_idx on chat_messages (conversation_id, seq desc);
-- Contagem de não lidas por conversa.
create index chat_messages_unread_idx on chat_messages (conversation_id, sender_id) where read_at is null;

-- Bloqueio por par de usuários (CH-08): vale para todas as conversas entre os dois.
create table chat_blocks (
  blocker_id uuid not null references users (id) on delete cascade,
  blocked_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create index chat_blocks_blocked_id_idx on chat_blocks (blocked_id);

-- Fila de moderação (CH-08).
create table chat_reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  reporter_id uuid not null references users (id) on delete cascade,
  reported_id uuid not null references users (id) on delete cascade,
  reason text not null check (reason in ('scam', 'harassment', 'spam', 'fake', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index chat_reports_pending_idx on chat_reports (created_at) where status = 'pending';

alter table conversations enable row level security;
alter table chat_photos enable row level security;
alter table chat_messages enable row level security;
alter table chat_blocks enable row level security;
alter table chat_reports enable row level security;
