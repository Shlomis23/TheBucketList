#!/usr/bin/env bash
# מריץ Supabase מזויף + next dev מולו, ומצלם את כל המסכים לתיקייה.
# bash scripts/design-preview/run.sh <out-dir>
set -euo pipefail
OUT="${1:-design-shots}"
cd "$(dirname "$0")/../.."
node scripts/design-preview/fake-supabase.mjs > /tmp/fake-supabase.log 2>&1 &
FAKE=$!
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon \
SUPABASE_SERVICE_ROLE_KEY=fake-service-role-key \
  npx next dev -p 3200 > /tmp/design-preview-next.log 2>&1 &
NEXT=$!
trap 'kill $FAKE $NEXT 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3200/login && break; sleep 1; done
# חימום: קומפילציה ראשונה של כל מסך לפני הצילום
node scripts/design-preview/shoot.mjs "$OUT.warmup" > /dev/null 2>&1 || true
rm -rf "$OUT.warmup"
node scripts/design-preview/shoot.mjs "$OUT"
