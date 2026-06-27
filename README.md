# occu-med-price-conversion

A price conversion tool for Occu-Med exam components, built with React + Vite.

- **Frontend**: React + Vite (Render Static Web Service)
- **Backend**: Minimal Render Node API service (`backend/server.mjs`) — health check only
- **Rates**: Fetched automatically from `https://api.exchangerate-api.com/v4/latest/USD`

## Features

- Exam-component sidebar for adding medical exams, tests, and fees to a price table
- Live USD-based exchange rates, refreshed automatically every hour
- Price conversion from USD to any selected currency
- Per-row and total converted values

## Architecture

### Frontend
- Fetches live exchange rates directly from the public API
- Renders an exam-component sidebar and a price conversion table
- Lets users add components, enter USD prices, and select a target currency

### Backend
- Provides a health check endpoint for Render monitoring

## Render deployment

This repo includes `render.yaml` with **two services**.

### 1) Backend service (`occu-med-backend`)
- Runtime: Node
- Build command: `npm ci`
- Start command: `npm run start:backend`
- Health check path: `/health`

Required backend env vars:
- `FRONTEND_ORIGIN` (optional; default `*`)

### 2) Frontend service (`occu-med-frontend`)
- Runtime: Static Site
- Build command: `npm ci && npm run build`
- Publish dir: `dist`
- Rewrite rule: `/* -> /index.html`

No frontend env vars are required. The app uses a public exchange-rate API.

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
- The backend is optional for local development; the frontend can run independently.
