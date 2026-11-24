-- "Vi este pet": um avistamento pode apontar para a ocorrência de pet perdido que ele ajuda a achar.
-- O disparo de alertas avisa o tutor dessa ocorrência, em qualquer distância.
alter table occurrences add column sighting_of uuid references occurrences(id) on delete set null;
