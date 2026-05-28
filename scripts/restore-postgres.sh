#!/usr/bin/env bash
# GRASS ERP — PostgreSQL Restore Script
# Usage: ./scripts/restore-postgres.sh <backup_file>
set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Available backups:"
  ls -1 ./backups/*.dump 2>/dev/null || echo "  (no backups found in ./backups/)"
  exit 1
fi

LOG_FILE="restore_$(date +%Y%m%d_%H%M%S).log"

# Load .env if available
if [ -f .env ]; then
  set -a; source .env; set +a
fi

: "${DATABASE_URL:=postgresql://localhost:5432/grass_erp}"

echo "[$(date +%T)] WARNING: This will DROP and recreate the database!" | tee -a "$LOG_FILE"
echo "[$(date +%T)] Database target: $DATABASE_URL" | tee -a "$LOG_FILE"
echo "[$(date +%T)] Backup file: $BACKUP_FILE" | tee -a "$LOG_FILE"

read -r -p "Are you sure? (yes/NO): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "[$(date +%T)] Starting restore..." | tee -a "$LOG_FILE"

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname="$DATABASE_URL" \
  --jobs=4 \
  "$BACKUP_FILE" \
  2>&1 | tee -a "$LOG_FILE"

echo "[$(date +%T)] Restore complete from: $BACKUP_FILE" | tee -a "$LOG_FILE"
