#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
EMAIL="${2:-admin@grass.com}"
PASSWORD="${3:-admin123}"

# ---- helpers ----
green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red() { printf "\033[31m✗ %s\033[0m\n" "$1"; }

COOKIE_JAR=$(mktemp)
OUT=$(mktemp)
PASS=0
FAIL=0
TOTAL=0
ok() { green "$1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail() { red "$1"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }

cleanup() { rm -f "$COOKIE_JAR" "$OUT"; }
trap cleanup EXIT

echo "=============================================="
echo "  Phase 1.9 — Runtime API Verification"
echo "  Target: $BASE_URL"
echo "=============================================="
echo ""

# ---- LOGIN ----
curl -s -o /dev/null -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c "$COOKIE_JAR"

# ---- GET COMPANY ----
curl -s -o "$OUT" "$BASE_URL/api/companies" -b "$COOKIE_JAR"
CID=$(python3 -c "import json; d=json.load(open('$OUT')); print(d['data'][0]['id'])" 2>/dev/null)

# ---- GET FISCAL PERIOD ----
curl -s -o "$OUT" "$BASE_URL/api/fiscal-periods?companyId=$CID" -b "$COOKIE_JAR"
FPID=$(python3 -c "
import json; d=json.load(open('$OUT'))
items = d.get('data', d if isinstance(d, list) else [])
if isinstance(items, dict) and 'data' in items: items = items['data']
if isinstance(items, dict): items = [items]
print(items[0]['id'] if isinstance(items, list) and len(items) > 0 else '')" 2>/dev/null)

# ---- GET ACCOUNTS ----
curl -s -o "$OUT" "$BASE_URL/api/accounts?companyId=$CID" -b "$COOKIE_JAR"

ACC1=$(python3 -c "
import json; d=json.load(open('$OUT'))
items = d.get('data', [])
for a in items:
    if a.get('normalBalance') == 'DEBIT' and a.get('isActive') and a.get('isPosting'):
        print(a['id']); break
" 2>/dev/null)

ACC2=$(python3 -c "
import json; d=json.load(open('$OUT'))
items = d.get('data', [])
for a in items:
    if a.get('normalBalance') == 'CREDIT' and a.get('isActive') and a.get('isPosting'):
        print(a['id']); break
" 2>/dev/null)

echo "  companyId=$CID  periodId=$FPID  debitAcc=$ACC1  creditAcc=$ACC2"
echo ""

# ============================================================
echo "--- 1. CREATE DRAFT journal entry ---"
CREATE_CODE=$(curl -s -o "$OUT" -w "%{http_code}" -X POST "$BASE_URL/api/journal-entries" \
  -H "Content-Type: application/json" -b "$COOKIE_JAR" \
  -d "{\"companyId\":\"$CID\",\"fiscalPeriodId\":\"$FPID\",\"currency\":\"IQD\",\"description\":\"Runtime verify JE\",\"lines\":[{\"accountId\":\"$ACC1\",\"debit\":1000,\"credit\":0},{\"accountId\":\"$ACC2\",\"debit\":0,\"credit\":1000}]}")
JE_ID=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('data',{}).get('id',''))" 2>/dev/null)
if [ "$CREATE_CODE" = "201" ] && [ -n "$JE_ID" ]; then
  ok "CREATE journal -> 201  id=$JE_ID"
else
  fail "CREATE journal -> $CREATE_CODE (expected 201)  id=$JE_ID"
fi

# ============================================================
echo "--- 2. POST journal ---"
POST_CODE=$(curl -s -o "$OUT" -w "%{http_code}" -X POST "$BASE_URL/api/journal-entries/$JE_ID/post" \
  -H "Content-Type: application/json" -b "$COOKIE_JAR" -d '{}')
POST_JE_ID=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('data',{}).get('journalEntryId',''))" 2>/dev/null)
if [ "$POST_CODE" = "200" ] && [ -n "$POST_JE_ID" ]; then
  ok "POST journal -> 200  journalEntryId=$POST_JE_ID"
else
  fail "POST journal -> $POST_CODE (expected 200)  journalEntryId=$POST_JE_ID"
fi

# ============================================================
echo "--- 3. DELETE posted journal (MUST FAIL) ---"
DEL_CODE=$(curl -s -o "$OUT" -w "%{http_code}" -X DELETE "$BASE_URL/api/journal-entries/$JE_ID" -b "$COOKIE_JAR")
DEL_BODY=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('error',''))" 2>/dev/null)
if [ "$DEL_CODE" != "200" ]; then
  ok "DELETE posted journal -> $DEL_CODE  (rejected: $DEL_BODY)"
else
  fail "DELETE posted journal -> $DEL_CODE  (expected rejection, got success)"
fi

# ============================================================
echo "--- 4. DUPLICATE post (MUST FAIL) ---"
DUP_CODE=$(curl -s -o "$OUT" -w "%{http_code}" -X POST "$BASE_URL/api/journal-entries/$JE_ID/post" \
  -H "Content-Type: application/json" -b "$COOKIE_JAR" -d '{}')
if [ "$DUP_CODE" != "200" ]; then
  ok "DUPLICATE post -> $DUP_CODE  (rejected as expected)"
else
  fail "DUPLICATE post -> $DUP_CODE  (expected rejection)"
fi

# ============================================================
echo "--- 5. EDIT posted journal (MUST FAIL) ---"
EDIT_CODE=$(curl -s -o "$OUT" -w "%{http_code}" -X PATCH "$BASE_URL/api/journal-entries/$JE_ID" \
  -H "Content-Type: application/json" -b "$COOKIE_JAR" \
  -d "{\"companyId\":\"$CID\",\"description\":\"should fail\",\"lines\":[{\"accountId\":\"$ACC1\",\"debit\":500,\"credit\":0},{\"accountId\":\"$ACC2\",\"debit\":0,\"credit\":500}]}")
if [ "$EDIT_CODE" != "200" ]; then
  ok "EDIT posted journal -> $EDIT_CODE  (rejected as expected)"
else
  fail "EDIT posted journal -> $EDIT_CODE  (expected rejection)"
fi

# ============================================================
echo "--- 6. DELETE DRAFT journal (MUST SUCCEED) ---"
CREATE2_CODE=$(curl -s -o "$OUT" -w "%{http_code}" -X POST "$BASE_URL/api/journal-entries" \
  -H "Content-Type: application/json" -b "$COOKIE_JAR" \
  -d "{\"companyId\":\"$CID\",\"fiscalPeriodId\":\"$FPID\",\"currency\":\"IQD\",\"description\":\"DRAFT to delete\",\"lines\":[{\"accountId\":\"$ACC1\",\"debit\":500,\"credit\":0},{\"accountId\":\"$ACC2\",\"debit\":0,\"credit\":500}]}")
DRAFT_ID=$(python3 -c "import json; d=json.load(open('$OUT')); print(d.get('data',{}).get('id',''))" 2>/dev/null)
DEL2_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/journal-entries/$DRAFT_ID" -b "$COOKIE_JAR")
if [ "$DEL2_CODE" = "200" ]; then
  ok "DELETE DRAFT journal -> 200  (succeeded)"
else
  fail "DELETE DRAFT journal -> $DEL2_CODE  (expected 200)"
fi

# ============================================================
echo "--- 7. UNAUTHENTICATED access ---"
for path in /api/journal-entries /api/journal-entries/$JE_ID; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
  if [ "$CODE" = "401" ]; then
    ok "  GET $path (no auth) -> 401"
  else
    fail "  GET $path (no auth) -> $CODE (expected 401)"
  fi
done

# ============================================================
echo "--- 8. auth/me response shape ---"
ME_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/auth/me" -b "$COOKIE_JAR")
ME_KEYS=$(python3 -c "import json; d=json.load(open('$OUT')); keys=sorted(d.keys()); print(','.join(keys))" 2>/dev/null)
if [ "$ME_CODE" = "200" ] && [ "$ME_KEYS" = "data,success" ]; then
  ok "auth/me -> 200, shape={success,data}"
else
  fail "auth/me -> $ME_CODE(keys=$ME_KEYS) expected 200,{success,data}"
fi

# ============================================================
echo "--- 9. error response shape (unauthenticated) ---"
ERR_CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE_URL/api/journal-entries")
ERR_KEYS=$(python3 -c "import json; d=json.load(open('$OUT')); keys=sorted(d.keys()); print(','.join(keys))" 2>/dev/null)
if [ "$ERR_CODE" = "401" ] && [ "$ERR_KEYS" = "error,success" ]; then
  ok "error response -> 401, shape={success,error}"
else
  fail "error response -> $ERR_CODE(keys=$ERR_KEYS) expected 401,{success,error}"
fi

# ---- LOGOUT ----
curl -s -o /dev/null -X POST "$BASE_URL/api/auth/logout" -b "$COOKIE_JAR"

echo ""
echo "=============================================="
echo "  Runtime API Verification Results:"
echo "  $PASS passed / $FAIL failed (of $TOTAL)"
echo "=============================================="
exit $FAIL
