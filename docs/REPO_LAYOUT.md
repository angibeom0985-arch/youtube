# Repository Layout

## Runtime

```
api/                        # Vercel serverless APIs
YOUTUBE/
  admin-server.js           # Local admin helper server
  apps/
    studio/                 # Main Vite + React app
    benchmarking/           # Standalone Next.js benchmarking app
  docs/
    api-guide/              # API key guide docs/images
  config/                   # Local runtime config assets
  scripts/                  # Utility scripts (OG generation, etc.)
  tests/                    # Local test assets
```

## Build Outputs and Archives

```
dist/                       # Vite build output
archive/                    # Archived snapshots/reports
docs/                       # Global project docs
scripts/                    # Repo-level automation scripts
```

## Studio App Internal Layout

```
YOUTUBE/apps/studio/
  public/
  src/
    features/               # Route-level pages by feature
    components/             # Shared UI components
    services/               # Shared service modules
    utils/                  # Shared utilities
    types.ts
  supabase/
```

## API Internal Layout

```
api/
  features/                # API handlers grouped by feature
    script/
    image/
    tts/
    admin/
    abuse/
    user/
  shared/                  # Shared API libraries (auth, credits, supabase, guards)
```
