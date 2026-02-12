-- Create guides table
create table if not exists guides (
  page_type text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table guides enable row level security;

-- Create policies
-- Allow public read access (needed for general users to see the guide)
create policy "Public guides are viewable by everyone"
  on guides for select
  using ( true );

-- Allow public insert/update for now since AdminEditorPage uses custom local auth
-- In a production environment, you should link this to Supabase Auth
create policy "Enable insert for everyone"
  on guides for insert
  with check ( true );

create policy "Enable update for everyone"
  on guides for update
  using ( true );
