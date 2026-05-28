# GRASS ERP — Backup & Recovery Policy

## Schedule
- **Daily**: Full database backup at 02:00 (cron)
- **WAL archiving**: Continuous (point-in-time recovery)
- **Monthly**: Retained 12 months
- **Yearly**: Retained 7 years (financial data)

## Scripts
- `scripts/backup-postgres.sh` — pg_dump custom format with compression
- `scripts/restore-postgres.sh` — pg_restore with interactive confirmation

## Usage
```bash
npm run db:backup              # default: ./backups/
npm run db:restore ./backups/grass_erp_20250528_020000.dump
```

## Retention
- Rotate backups older than 30 days on disk
- Keep monthly snapshot for 12 months
- Keep yearly financial snapshot for 7 years
- Off-site copy required before production data

## Restore Drill
Before going live: test full restore and verify data integrity.
