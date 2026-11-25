-- Códigos de troca de senha, separados dos de verificação de e-mail: um nunca serve no lugar do outro.
create table password_reset_codes (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now()
);

alter table password_reset_codes enable row level security;
