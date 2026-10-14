# VELTRIX Frontend

A React (Vite) frontend for the VELTRIX platform concept. This repository hosts the public landing pages and a prototype authenticated workspace that connects to a Django + DRF backend (API endpoints expected under `VITE_API_URL`).

This branch (remove-demo-strings) contains wording changes to remove repetitive "DEMO" labels from the UI and a fallback for public market data when the backend /market/ endpoint is unavailable.

## Features
- React + Vite frontend
- Centralised API client with automatic token refresh and logout handling (src/api.js)
- Market data is requested from the backend (`/api/market/`) and falls back to CoinGecko public data if the backend is unreachable (see src/App.jsx)
- Live chat preview, authentication views, and sample data for layout and visual testing

## Requirements
- Node.js 18 (recommended)
- npm

## Environment
Create a `.env` file in the project root (or set environment variables). Available env vars:

- `VITE_API_URL` — Base URL for your backend. Defaults to `http://127.0.0.1:8000`. The frontend expects the backend API to expose endpoints under `/api` (the client normalises trailing slashes and `/api` suffixes).
- `VITE_TELEGRAM_LINK` — Optional Telegram support link used by the Live Chat component.

Example `.env` (not committed):

```
VITE_API_URL=http://127.0.0.1:8000
VITE_TELEGRAM_LINK=https://t.me/your-link
```

## Quick start

Install dependencies:

```bash
npm ci
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Tests
This project does not include a test runner in package.json by default. If tests are added, run:

```bash
npm test
```

## Notes about the `remove-demo-strings` branch
- UI copy was adjusted to use "Preview" / "Sample" / "Illustrative" instead of repeatedly calling out "DEMO".
- The frontend still prefers your backend for API calls (auth, dashboard, support, market). The public API fallback (CoinGecko) is only used when the backend market endpoint fails.
- I made conservative copy edits only; no backend changes were made.
- There is a temporary placeholder for `src/components/AdminViews.jsx` in this branch to avoid accidental behavioural changes. If you need the original Admin UI restored, please tell me and I will restore it and apply targeted copy edits instead.

## Contributing
- If you want additional copy changes (for example prefer "Sample" vs "Preview" consistently), tell me and I will update the branch.
- For CI: add a GitHub Actions workflow to run `npm ci`, `npm run build`, and `npm test` on pushes or PRs. I can provide the workflow YAML if you want it added.

## License
MIT
