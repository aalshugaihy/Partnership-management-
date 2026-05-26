#!/usr/bin/env bash
# Post-deployment verification script.
# Usage: ./scripts/verify-deployment.sh https://your-app.onrender.com admin@local your-password
set -e

URL="${1:-http://localhost:3000}"
EMAIL="${2:-admin@local}"
PASSWORD="${3:-admin1234}"
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
gray()  { printf "\033[90m%s\033[0m\n" "$*"; }

assert_code() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "  ✓ $desc → $actual"
  else
    red "  ✗ $desc → expected $expected, got $actual"
    exit 1
  fi
}

echo "═══ Verifying deployment at $URL ═══"
echo ""

echo "▼ Health check (public)"
code=$(curl -sk -o /dev/null -w "%{http_code}" "$URL/api/health")
assert_code "GET /api/health" "200" "$code"

echo ""
echo "▼ Auth required for protected pages"
code=$(curl -sk -o /dev/null -w "%{http_code}" "$URL/")
assert_code "GET / (unauth)" "307" "$code"

echo ""
echo "▼ Login"
code=$(curl -sk -c "$COOKIE_JAR" -o /dev/null -w "%{http_code}" -X POST "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
assert_code "POST /api/auth/login" "200" "$code"

echo ""
echo "▼ All pages return 200"
for path in / /tasks /partners /pipeline /opportunities /workshops /map /kpi /outreach /recommendations /reports /import /licensed /users /audit; do
  code=$(curl -sk -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$URL$path")
  if [ "$code" = "200" ]; then
    green "  ✓ $path → $code"
  else
    red "  ✗ $path → $code"
    exit 1
  fi
done

echo ""
echo "▼ Data integrity"
partners_page=$(curl -sk -b "$COOKIE_JAR" "$URL/partners")
if echo "$partners_page" | grep -q "شراكة"; then green "  ✓ /partners contains Arabic 'شراكة'"; else red "  ✗ no Arabic content"; exit 1; fi

echo ""
echo "▼ Backup endpoint produces a real SQLite file"
size=$(curl -sk -b "$COOKIE_JAR" -o /tmp/backup.db -w "%{size_download}" "$URL/api/backup")
if [ "$size" -gt 50000 ]; then green "  ✓ Backup size $size bytes"; else red "  ✗ Backup too small ($size bytes)"; exit 1; fi
rm -f /tmp/backup.db

echo ""
echo "▼ Excel export produces .xlsx"
size=$(curl -sk -b "$COOKIE_JAR" -o /tmp/export.xlsx -w "%{size_download}" "$URL/api/export?type=partners")
if [ "$size" -gt 5000 ]; then green "  ✓ Export size $size bytes"; else red "  ✗ Export too small"; exit 1; fi
rm -f /tmp/export.xlsx

echo ""
green "═══════════ ALL CHECKS PASSED ═══════════"
echo ""
gray "  Deployment URL: $URL"
gray "  Logged in as:   $EMAIL"
echo ""
