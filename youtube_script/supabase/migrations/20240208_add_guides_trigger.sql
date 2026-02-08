-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger for guides table
drop trigger if exists update_guides_updated_at on guides;

create trigger update_guides_updated_at
  before update on guides
  for each row
  execute function update_updated_at_column();

-- Update RLS policies to allow upsert
drop policy if exists "Enable insert for everyone" on guides;
drop policy if exists "Enable update for everyone" on guides;

create policy "Enable insert for everyone"
  on guides for insert
  to public
  with check ( true );

create policy "Enable update for everyone"
  on guides for update
  to public
  using ( true )
  with check ( true );
