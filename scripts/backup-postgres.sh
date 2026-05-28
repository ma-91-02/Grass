#!/usr/bin/env bash
# GRASS ERP — PostgreSQL Backup Script
# Usage: ./scripts/backup-postgres.sh [output_dir]
set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${OUTPUT_DIR}/grass_erp_${TIMESTAMP}.dump"
LOG_FILE="${OUTPUT_DIR}/backup_${TIMESTAMP}.log"

mkdir -p "$OUTPUT_DIR"

# Load .env if available (for DATABASE_URL)
if [ -f .env ]; then
  set -a; source .env; set +a
fi

: "${DATABASE_URL:=postgresql://localhost:5432/grass_erp}"

echo "[$(date +%T)] Starting backup..." | tee -a "$LOG_FILE"

pg_dump \
  --no-owner \
  --no-acl \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_FILE" \
  --dbname="$DATABASE_URL" \
  2>&1 | tee -a "$LOG_FILE"

echo "[$(date +%T)] Backup complete: $BACKUP_FILE" | tee -a "$LOG_FILE"
echo "[$(date +%T)] Size: $(du -h "$BACKUP_FILE" | cut -f1)" | tee -a "$LOG_FILE"
