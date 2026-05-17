#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
EMAIL="${2:-admin@grass.com}"
PASSWORD="${3:-admin123}"
PASS=0
FAIL=0

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red() { printf "\033[31m✗ %s\033[0m\n" "$1"; }

COOKIE_JAR=$(mktemp)
OUT=$(mktemp)

cleanup() { rm -f "$COOKIE_JAR" "$OUT"; }
trap cleanup EXIT

echo "=============================================="
echo "  GRASS ERP - Foundation Smoke Test"
echo "  Target: $BASE_URL"
echo "=============================================="
echo ""

# ---- LOGIN ----
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

# ---- AUTH /me ----
echo "--- AUTH /me ---"
ME_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/auth/me" -b "$COOKIE_JAR")
if [ "$ME_CODE" = "200" ]; then
  ME_SUCCESS=$(python3 -c "import json; print(json.load(open('$OUT')).get('success',False))" 2>/dev/null)
  if [ "$ME_SUCCESS" = "True" ]; then
    green "GET /api/auth/me -> 200 + success:true"
    PASS=$((PASS+1))
  else
    red "GET /api/auth/me body missing success:true"
    FAIL=$((FAIL+1))
  fi
else
  red "GET /api/auth/me -> $ME_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

# ---- COMPANIES ----
echo "--- COMPANIES ---"
COMP_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/companies" -b "$COOKIE_JAR")
if [ "$COMP_CODE" = "200" ]; then
  COMP_SUCCESS=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('success',False))" 2>/dev/null)
  if [ "$COMP_SUCCESS" = "True" ]; then
    green "GET /api/companies -> 200 + success:true"
    PASS=$((PASS+1))
  else
    red "GET /api/companies body missing success:true"
    FAIL=$((FAIL+1))
  fi
else
  red "GET /api/companies -> $COMP_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

# ---- ACCOUNTS ----
echo "--- ACCOUNTS ---"
ACC_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/accounts" -b "$COOKIE_JAR")
if [ "$ACC_CODE" = "200" ]; then
  ACC_SUCCESS=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('success',False))" 2>/dev/null)
  if [ "$ACC_SUCCESS" = "True" ]; then
    green "GET /api/accounts -> 200 + success:true"
    PASS=$((PASS+1))
  else
    red "GET /api/accounts body missing success:true"
    FAIL=$((FAIL+1))
  fi
else
  red "GET /api/accounts -> $ACC_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

# ---- BRANCHES ----
echo "--- BRANCHES ---"
BR_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/branches" -b "$COOKIE_JAR")
if [ "$BR_CODE" = "200" ]; then
  BR_SUCCESS=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('success',False))" 2>/dev/null)
  if [ "$BR_SUCCESS" = "True" ]; then
    green "GET /api/branches -> 200 + success:true"
    PASS=$((PASS+1))
  else
    red "GET /api/branches body missing success:true"
    FAIL=$((FAIL+1))
  fi
else
  red "GET /api/branches -> $BR_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

# ---- FISCAL PERIODS ----
echo "--- FISCAL PERIODS ---"
FP_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/fiscal-periods" -b "$COOKIE_JAR")
if [ "$FP_CODE" = "200" ]; then
  FP_SUCCESS=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('success',False))" 2>/dev/null)
  if [ "$FP_SUCCESS" = "True" ]; then
    green "GET /api/fiscal-periods -> 200 + success:true"
    PASS=$((PASS+1))
  else
    red "GET /api/fiscal-periods body missing success:true"
    FAIL=$((FAIL+1))
  fi
else
  red "GET /api/fiscal-periods -> $FP_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

# ---- JOURNAL ENTRIES ----
echo "--- JOURNAL ENTRIES ---"
JE_CODE=$(curl -s -o "$OUT" -w "%{http_code}}" "$BASE_URL/api/journal-entries" -b "$COOKIE_JAR")
if [ "$JE_CODE" = "200" ]; then
  JE_SUCCESS=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('success',False))" 2>/dev/null)
  if [ "$JE_SUCCESS" = "True" ]; then
    green "GET /api/journal-entries -> 200 + success:true"
    PASS=$((PASS+1))
  else
    red "GET /api/journal-entries body missing success:true"
    FAIL=$((FAIL+1))
  fi
else
  red "GET /api/journal-entries -> $JE_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

# ---- USERS ----
echo "--- USERS ---"
USR_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/users" -b "$COOKIE_JAR")
if [ "$USR_CODE" = "200" ]; then
  USR_SUCCESS=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('success',False))" 2>/dev/null)
  if [ "$USR_SUCCESS" = "True" ]; then
    green "GET /api/users -> 200 + success:true"
    PASS=$((PASS+1))
  else
    red "GET /api/users body missing success:true"
    FAIL=$((FAIL+1))
  fi
else
  red "GET /api/users -> $USR_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

# ---- UNAUTHENTICATED ACCESS REJECTION ----
echo "--- UNAUTHENTICATED ---"
for path in /api/companies /api/accounts /api/branches /api/fiscal-periods /api/journal-entries /api/users; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
  if [ "$CODE" = "401" ]; then
    green "GET $path (no auth) -> 401"
    PASS=$((PASS+1))
  else
    red "GET $path (no auth) -> $CODE (expected 401)"
    FAIL=$((FAIL+1))
  fi
done

# ---- UNAUTHORIZED PERMISSION CHECK ----
echo "--- ACCOUNTS TREE (should need permission) ---"
TREE_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/accounts/tree" -b "$COOKIE_JAR")
if [ "$TREE_CODE" = "400" ] || [ "$TREE_CODE" = "403" ]; then
  green "GET /api/accounts/tree -> $TREE_CODE (needs companyId or permission)"
  PASS=$((PASS+1))
else
  red "GET /api/accounts/tree -> $TREE_CODE (expected 400 or 403)"
  FAIL=$((FAIL+1))
fi

# ---- LOGOUT ----
echo "--- LOGOUT ---"
LOGOUT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/logout" -b "$COOKIE_JAR")
if [ "$LOGOUT_CODE" = "200" ]; then
  green "POST /api/auth/logout -> 200"
  PASS=$((PASS+1))
else
  red "POST /api/auth/logout -> $LOGOUT_CODE (expected 200)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "=============================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "=============================================="

exit $FAIL
