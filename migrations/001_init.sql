create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  role_title text not null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id text primary key,
  owner_id text not null references users (id),
  title text not null,
  content_html text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_idx on documents (owner_id);

create table if not exists shares (
  document_id text not null references documents (id) on delete cascade,
  user_id text not null references users (id),
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index if not exists shares_user_idx on shares (user_id);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_expires_idx on sessions (expires_at);
