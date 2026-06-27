# occu-med-price-conversion

A price conversion tool for Occu-Med exam components, built with React + Vite.

- **Frontend**: React + Vite (Render Static Web Service)
- **Backend**: Render Node API service (`backend/server.mjs`) with Neon PostgreSQL persistence
- **Rates**: Fetched automatically from `https://api.exchangerate-api.com/v4/latest/USD`
- **Persistence**: Conversion sheets are stored in Neon and shared across users

## Features

- Exam-component sidebar for adding medical exams, tests, and fees to a price table
- Live USD-based exchange rates, refreshed automatically every hour
- Price conversion from USD to any selected currency
- Per-row and total converted values
- Save, load, and delete shared conversion sheets

## Architecture

### Frontend
- Fetches live exchange rates directly from the public API
- Renders an exam-component sidebar and a price conversion table
- Calls the backend to save/load/delete shared conversion sheets

### Backend
- Provides CRUD API endpoints for conversion sheets
- Stores sheets in a Neon PostgreSQL `sheets` table
- Auto-creates the table on first request

## Neon setup

1. Create a new project in Neon.
2. Copy the connection string (e.g., `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`).
3. Set it as `DATABASE_URL` on your Render backend service.

**Important:** the connection string must be the standard Neon hostname (e.g., `...pooler.us-east-1.aws.neon.tech`). If you see `Save failed` with `getaddrinfo ENOTFOUND`, the hostname contains an invalid segment (such as `.c-9`). Remove it and remove `channel_binding=require`.

Example:
```
postgresql://neondb_owner:PASSWORD@ep-icy-salad-atepu99t-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

The backend will create the `sheets` table automatically:

```sql
create table if not exists sheets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_currency text not null default 'EUR',
  rows jsonb not null default '[]'::jsonb,
  adjustments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Render deployment

This repo includes `render.yaml` with **two services**.

### 1) Backend service (`occu-med-backend`)
- Runtime: Node
- Build command: `npm ci`
- Start command: `npm run start:backend`
- Health check path: `/health`

Required backend env vars:
- `DATABASE_URL` (Neon connection string)
- `FRONTEND_ORIGIN` (optional; default `*`)
- `NODE_ENV` (set to `production` on Render)

### 2) Frontend service (`occu-med-frontend`)
- Runtime: Static Site
- Build command: `npm ci && npm run build`
- Publish dir: `dist`
- Rewrite rule: `/* -> /index.html`

Required frontend env vars:
- `VITE_API_BASE_URL` (public URL of backend service)

## Local development

Terminal 1 (backend):
```bash
npm install
# Set DATABASE_URL to a local Postgres or Neon database
npm run dev:backend
```

Terminal 2 (frontend):
```bash
npm run dev
```

## Notes

- Rates are provided by a free public API and may have usage limits.
- The backend needs a `DATABASE_URL` pointing to a PostgreSQL database (Neon or local Postgres).
