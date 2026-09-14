-- Hardening dei grant di default sullo schema public.
--
-- I grant di default di Supabase concedono ad anon e authenticated l'intero
-- ventaglio di privilegi su ogni tabella creata in public, TRUNCATE incluso.
-- TRUNCATE non e soggetto a row level security: un utente autenticato con quel
-- privilegio puo svuotare una tabella qualunque policy sia definita sopra.
-- Anche REFERENCES e TRIGGER non servono a nessun ruolo del browser.
--
-- Le policy RLS restano il meccanismo di autorizzazione: qui si toglie soltanto
-- cio che le policy non possono trattenere.

do $$
declare v_table record;
begin
  for v_table in
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format(
      'revoke truncate, references, trigger on table public.%I from anon, authenticated',
      v_table.table_name);
  end loop;
end;
$$;

-- Le tabelle create in futuro non devono reintrodurre il problema.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
