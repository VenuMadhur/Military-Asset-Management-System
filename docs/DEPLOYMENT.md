# Deployment Guide — Military Asset Management System (MAMS)

This guide covers deploying MAMS across **Neon PostgreSQL** (Production Database Branch), **Render Web Service** (Backend API), and **Vercel** (Frontend SPA).

---

## 1. Configure Neon PostgreSQL Production Branch

1. Open your project in the [Neon Console](https://console.neon.tech/).
2. Confirm you have separate branches for isolation:
   - **Production branch** (e.g., `main` / `production`) — used exclusively by Render production.
   - **Development branch** (`mams-dev`) — used for local development.
   - **Test branch** (`mams-test`) — used exclusively for automated integration tests.
3. From the Neon **Production** branch dashboard, copy two distinct connection strings (both requiring `sslmode=require`):
   - **Pooled connection string** (hostname contains `-pooler`) -> use for `DATABASE_URL` (runtime queries).
   - **Direct connection string** (hostname without `-pooler`) -> use for `DIRECT_URL` (Prisma migrations).

### Backup & Recovery Considerations
- Rely on Neon's branch/point-in-time recovery (PITR) and create a manual snapshot or `pg_dump` before running production schema migrations.
- Never point local development, `npm test`, or `prisma/seed.js` at the production branch.

---

## 2. Configure Backend Environment Variables (Render)

In your Render Web Service **Environment** settings, define:

| Variable | Description | Example / Requirement |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | HTTP port (injected by Render) | `10000` (Render sets automatically) |
| `DATABASE_URL` | Neon **production pooled** connection URL | `postgresql://...pooler.../neondb?sslmode=require` |
| `DIRECT_URL` | Neon **production direct** connection URL | `postgresql://.../neondb?sslmode=require` |
| `JWT_SECRET` | 64+ char cryptographically random secret | Generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Distinct 64+ char random secret | Generate with `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRES_IN` | Short-lived access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `CLIENT_URL` | Required explicit Vercel origin(s), comma-separated, no trailing slash | `https://mams-app.vercel.app` |
| `LOGISTICS_GLOBAL_SCOPE` | Logistics Officer scope policy | `true` (or `false` for base-restricted) |
| `SEED_ENABLE_DEV_ACCOUNTS` | **Must be `false` in production** | `false` |

> **Important:** `backend/src/config/env.js` strictly requires `CLIENT_URL`, `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` in production and refuses to fall back to `localhost`. Never set `SEED_ENABLE_DEV_ACCOUNTS=true` in production.

---

## 3. Connect Backend Repository to Render

1. Click **New +** -> **Web Service** in Render and connect your GitHub repository.
2. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Node (`>=20.0.0` per `backend/package.json`)
   - **Build Command**: `npm ci && npx prisma generate`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

> **Migration Policy:** Do **not** place `npx prisma migrate deploy` in the Render build command. Build steps should only install dependencies and generate the Prisma Client; production schema migrations must be executed deliberately after verifying the target Neon branch.

---

## 4. Safe Production Migration Procedure

Run production migrations explicitly against the verified Neon production branch using `DIRECT_URL` (or via a supported Render Pre-Deploy Command / Render Shell after verifying the environment):

1. Confirm you are targeting the **Neon production branch** (never `mams-dev` or `mams-test`) by verifying the branch ID in a read-only check before migrating:
   ```sql
   SELECT current_setting('neon.branch_id', true) AS branch_id,
          current_setting('neon.endpoint_id', true) AS endpoint_id;
   ```
2. Verify pending migrations cleanly without applying changes:
   ```bash
   npx prisma migrate status
   ```
3. Capture a Neon branch snapshot / PITR checkpoint.
4. Apply committed migrations (never use `prisma migrate dev` or `prisma migrate reset` in production):
   ```bash
   npx prisma migrate deploy
   ```
5. Re-run `npx prisma migrate status` to confirm `Database schema is up to date`.

---

## 5. Verify Backend Health Endpoint

After the Render service starts (listening on `0.0.0.0:$PORT`):

```bash
curl https://<your-render-service>.onrender.com/api/health
```

Expected response: HTTP `200` with `"status": "ok"` and `"database": "connected"`.

---

## 6. Create Initial Production Admin Credentials Securely

Because `prisma/seed.js` refuses to run in production (`NODE_ENV === 'production'`), create the first administrator using `prisma/createProductionAdmin.js` inside the Render Shell (minimum 12-character password, hashed with `bcrypt` 12 rounds):

```bash
ADMIN_INIT_USERNAME="hq_admin" \
ADMIN_INIT_PASSWORD="<STRONG_UNIQUE_PASSWORD_12_PLUS_CHARS>" \
ADMIN_INIT_FULL_NAME="HQ Production Administrator" \
node prisma/createProductionAdmin.js
```

Store the credential in a password/secrets manager, unset temporary shell variables immediately, and create operational bases and equipment types via the authenticated Admin UI.

---

## 7. Configure & Deploy Vercel Frontend

1. Log in to [Vercel](https://vercel.com/) and import your GitHub repository.
2. Configure project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Install Command**: `npm ci`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable in Vercel:
   - `VITE_API_BASE_URL` = `https://<your-render-service>.onrender.com/api`
4. Keep [frontend/vercel.json](file:///c:/Users/choll/OneDrive/Desktop/MAMS/frontend/vercel.json) so React Router SPA routes rewrite cleanly to `/index.html`.
5. Deploy the frontend and note the assigned `.vercel.app` origin.

---

## 8. Cross-Origin Authentication & Custom Domain Architecture

### Current Cross-Origin Behavior (Vercel + Render)
- Access tokens (short-lived JWTs) are held exclusively in React memory (never `localStorage`) and sent via `Authorization: Bearer <token>`.
- Refresh tokens are issued in cookie `mams_refresh_token` with:
  - `HttpOnly: true` (inaccessible to JavaScript)
  - `Secure: true` (when `NODE_ENV=production`)
  - `SameSite: None` (when `NODE_ENV=production`, enabling cross-origin `*.vercel.app` -> `*.onrender.com` requests)
  - `Path: /api/auth`
- Express enables `app.set('trust proxy', 1)` so TLS termination at Render's reverse proxy preserves `Secure` cookie attributes.
- Credentialed CORS (`credentials: true`) allows **only** the explicit origins listed in `CLIENT_URL` (trailing slashes stripped).

### Browser Third-Party Cookie Restrictions
Because `*.vercel.app` and `*.onrender.com` are different top-level sites (cross-site), privacy-hardened browsers (Safari ITP, Firefox Enhanced Tracking Protection, or browsers blocking third-party cookies) may reject or purge `SameSite=None` refresh cookies, causing page reloads to require re-authentication while in-session Bearer requests continue working.

### Recommended Production Custom-Domain Setup
Do **not** weaken `HttpOnly`, `Secure`, `SameSite`, or `CLIENT_URL` CORS checks. Instead, host both apps under the same root domain so refresh cookies become **first-party**:
1. **Frontend (Vercel)**: `https://app.example.com` (`CNAME` -> `cname.vercel-dns.com`).
2. **Backend (Render)**: `https://api.example.com` (`CNAME` -> `<your-render-service>.onrender.com`).
3. Update `CLIENT_URL=https://app.example.com` on Render and `VITE_API_BASE_URL=https://api.example.com/api` on Vercel, then redeploy both services.

---

## 9. Post-Deployment Verification Checklist

1. Confirm `GET /api/health` returns `200` with `database: "connected"`.
2. Log in with the production Admin account, refresh the page to confirm session persistence, and create initial bases and equipment catalog items.
3. Verify RBAC isolation (`ADMIN`, `BASE_COMMANDER`, `LOGISTICS_OFFICER`), purchases, inter-base transfers, assignments, expenditures, and audit logs.
