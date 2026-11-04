create or replace function public.increment_list_entry_quantity(
  target_entry uuid,
  target_list uuid,
  expected_quantity numeric
)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_quantity numeric;
begin
  update public.list_entries
  set quantity = coalesce(quantity, 1) + 1,
      is_completed = false,
      completed_at = null,
      updated_at = now()
  where id = target_entry
    and list_id = target_list
    and coalesce(quantity, 1) = expected_quantity
  returning quantity into new_quantity;

  return new_quantity;
end;
$$;
