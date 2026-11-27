-- Limite por conta contra força bruta no login (complementa o limite por IP do ThrottlerGuard).
-- Só o e-mail digitado e a contagem: nada de senha nem IP. Vale também para e-mail sem conta,
-- para o bloqueio não revelar quem tem cadastro.
create table login_attempts (
  email text primary key,
  failures int not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);

alter table login_attempts enable row level security;
