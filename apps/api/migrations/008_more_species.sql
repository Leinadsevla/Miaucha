-- Outras espécies além de cão e gato (o app as mostra em "Outros"). Mesma lista de SPECIES no shared.
alter table pets drop constraint pets_species_check;
alter table pets add constraint pets_species_check
  check (species in ('dog', 'cat', 'bird', 'rabbit', 'rodent', 'reptile', 'other'));

alter table occurrences drop constraint occurrences_species_check;
alter table occurrences add constraint occurrences_species_check
  check (species in ('dog', 'cat', 'bird', 'rabbit', 'rodent', 'reptile', 'other'));
