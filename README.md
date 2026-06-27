# occu-med-price-conversion

A price conversion tool for Occu-Med exam components, built with React + Vite.

- **Frontend**: React + Vite (Render Static Web Service)
- **Backend**: Render Node API service (`backend/server.mjs`) with Supabase persistence
- **Rates**: Fetched automatically from `https://api.exchangerate-api.com/v4/latest/USD`
- **Persistence**: Conversion sheets are stored in Supabase and shared across users

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
- Stores sheets in Supabase (`sheets` table)

## Supabase setup

Create the `sheets` table:

```sql
create table if not exists public.sheets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  target_currency text not null default 'EUR',
  rows jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

RLS guidance:
- Keep RLS enabled on `sheets`
- For an internal/shared tool, add a policy allowing all operations for authenticated users, or enable anon access if the app is public

## Render deployment

This repo includes `render.yaml` with **two services**.

### 1) Backend service (`occu-med-backend`)
- Runtime: Node
- Build command: `npm ci`
- Start command: `npm run start:backend`
- Health check path: `/health`

Required backend env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN` (optional; default `*`)

### 2) Frontend service (`occu-med-frontend`)
- Runtime: Static Site
- Build command: `npm ci && npm run build`
- Publish dir: `dist`
- Rewrite rule: `/* -> /index.html`

Required frontend env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (public URL of backend service)

## Local development

Terminal 1 (backend):
```bash
npm install
npm run dev:backend
```

Terminal 2 (frontend):
```bash
npm run dev
```

## Notes

- Rates are provided by a free public API and may have usage limits.
- The backend needs Supabase credentials to save and load shared sheets.
