-- Confirmação de foto sem transação longa: a foto fica "em conferência" até este instante, enquanto o
-- storage é conferido fora do banco. Um segundo confirm espera; uma reserva vencida (falha no meio) é retomada.
alter table pet_photos add column confirming_until timestamptz;
alter table occurrence_photos add column confirming_until timestamptz;
alter table chat_photos add column confirming_until timestamptz;

-- O alerta guarda se veio do "Vi este pet" (distância de onde o pet sumiu) ou da proximidade comum
-- (distância da região do usuário). Calcular pela ocorrência erra quando o pet perdido já foi resolvido.
alter table alerts add column sighting boolean not null default false;
