-- No Supabase, tabelas do schema public ficam expostas pela Data API (anon/authenticated)
-- se não tiverem RLS. Sem políticas, o RLS nega tudo a esses papéis; a API conecta como
-- dona das tabelas e não é afetada. Toda tabela nova precisa desta linha (um teste confere).
alter table users enable row level security;
alter table email_codes enable row level security;
alter table refresh_tokens enable row level security;
alter table schema_migrations enable row level security;
