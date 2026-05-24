#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
EMAIL="${2:-}"
PASSWORD="${3:-}"
[ -z "$EMAIL" ] && { echo "Usage: $0 [base_url] <email> <password>"; exit 1; }
PASS=0
FAIL=0

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red() { printf "\033[31m✗ %s\033[0m\n" "$1"; }

COOKIE_JAR=$(mktemp)

echo "=============================================="
echo "  GRASS ERP - Login Smoke Test"
echo "  Target: $BASE_URL"
echo "  Email:  $EMAIL"
echo "=============================================="
echo ""

echo "--- LOGIN ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c "$COOKIE_JAR")
if [ "$HTTP_CODE" = "200" ]; then
  green "POST /api/auth/login -> 200"
  PASS=$((PASS+1))
else
  red "POST /api/auth/login -> $HTTP_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

HAS_COOKIE=$(grep -c "grass_auth_token" "$COOKIE_JAR" 2>/dev/null || true)
if [ "$HAS_COOKIE" -gt 0 ]; then
  green "grass_auth_token cookie set"
  PASS=$((PASS+1))
else
  red "grass_auth_token cookie NOT set"
  FAIL=$((FAIL+1))
fi

echo "--- BAD LOGIN ---"
BAD_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com","password":"wrong"}')
if [ "$BAD_CODE" = "401" ]; then
  green "Bad password -> 401"
  PASS=$((PASS+1))
else
  red "Bad password -> $BAD_CODE (expected 401)"
  FAIL=$((FAIL+1))
fi

echo "--- SESSION ---"
ME_CODE=$(curl -s -o /tmp/grass-me-out.json -w "%{http_code}" "$BASE_URL/api/auth/me" -b "$COOKIE_JAR")
if [ "$ME_CODE" = "200" ]; then
  green "GET /api/auth/me -> 200"
  PASS=$((PASS+1))
else
  red "GET /api/auth/me -> $ME_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

USER_ID=$(python3 -c "import json; d=json.load(open('/tmp/grass-me-out.json')); print(d.get('data',{}).get('userId',''))" 2>/dev/null)
if [ -n "$USER_ID" ]; then
  green "userId=$USER_ID"
  PASS=$((PASS+1))
else
  red "Empty userId in response"
  FAIL=$((FAIL+1))
fi

echo "--- DASHBOARD (authenticated) ---"
DASH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard" -b "$COOKIE_JAR")
if [ "$DASH_CODE" = "200" ]; then
  green "GET /dashboard -> 200"
  PASS=$((PASS+1))
else
  red "GET /dashboard -> $DASH_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

echo "--- DASHBOARD (unauthenticated) ---"
NOAUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
if [ "$NOAUTH_CODE" = "302" ]; then
  green "GET /dashboard (no cookie) -> 302 redirect"
  PASS=$((PASS+1))
else
  red "GET /dashboard (no cookie) -> $NOAUTH_CODE (expected 302)"
  FAIL=$((FAIL+1))
fi

rm -f "$COOKIE_JAR" /tmp/grass-me-out.json

echo ""
echo "=============================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "=============================================="

exit $FAIL
