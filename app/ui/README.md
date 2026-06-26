# Delivery Optimizer UI

Next.js frontend for preparing optimization payloads and viewing route results.

## Prerequisites

- Node.js `>=20.9.0`
- npm

## Run

From repository root:

```bash
npm --prefix app/ui install
npm --prefix app/ui run dev
```

Open [http://localhost:3000](http://localhost:3000).

Alternatively, run from `app/ui` directly:

```bash
cd app/ui
npm install
npm run dev
```

## Quality Checks

```bash
npm --prefix app/ui run lint
npm --prefix app/ui run build
```

## Feedback endpoint operations

The feedback API's IP rate limit and daily accepted counter are process-local.
On multi-instance App Hosting / Cloud Run deployments they are best-effort per
instance; keep reCAPTCHA configured, and add an external counter if stricter
cross-instance abuse protection is required.
