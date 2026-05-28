# GRASS ERP — Coolify Trial Deployment Plan

## Prerequisites
- Coolify server (self-hosted or cloud)
- Git repository with access (GitHub/GitLab/Bitbucket)
- PostgreSQL 16 instance (Coolify service or external)

## Deployment Steps

### 1. Add PostgreSQL Service in Coolify
- **Type**: PostgreSQL 16
- **Database**: `grass_erp`
- **User**: `grass`
- **Password**: Generate a strong random password
- **Internal port**: 5432

### 2. Add Application in Coolify
- **Source**: Git repository (private or public)
- **Build pack**: Dockerfile (Coolify auto-detects)
- **Port**: 3000

### 3. Set Environment Variables in Coolify UI

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://grass:<password>@<service-name>:5432/grass_erp?schema=public` |
| `JWT_SECRET` | `openssl rand -hex 32` (generate fresh) |
| `NEXT_PUBLIC_APP_URL` | `https://<your-coolify-domain>` |
| `SYSTEM_OWNER_EMAIL` | Admin email address |
| `SYSTEM_OWNER_PASSWORD` | Strong password (min 12 chars) |
| `SYSTEM_OWNER_NAME` | Owner display name |
| `NODE_ENV` | `production` |

### 4. Deploy
1. Click "Deploy" in Coolify dashboard
2. Wait for build (first build may take 2-3 minutes)
3. Check logs for any errors

### 5. First-Run Setup (Post-Deploy)
Run these commands via Coolify terminal or exec into container:

```bash
# Apply database migrations
npx prisma migrate deploy

# Seed system owner account
npx tsx prisma/seed.ts
```

### 6. Verify Deployment
```bash
curl https://<your-coolify-domain>/api/health
# Expected: {"status":"healthy","db":{"connected":true}}
```

## Rollback
1. In Coolify, go to the application → "Rollback" tab
2. Select a previous deployment version
3. Click "Rollback" — Coolify rebuilds and redeploys the selected version

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Cannot connect to database` | Wrong `DATABASE_URL` | Check env vars, service name, password |
| `Connection refused` | DB not ready | Ensure PostgreSQL started before app |
| `Migration not found` | Prisma not generated | Run `npx prisma generate` in container |
| `App returns 503` | DB down | Restart PostgreSQL service |
| `JWT errors` | Secret changed | Set a stable `JWT_SECRET` |
