#!/bin/bash

# Login and save cookies
COOKIE_FILE=$(mktemp)

echo "=== Step 1: Login as admin ==="
curl -s -c $COOKIE_FILE -X POST https://exportapp-tw.tech/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"admin","password":"admin2024"}' | jq

echo -e "\n=== Step 2: Check session (should include role) ==="
curl -s -b $COOKIE_FILE https://exportapp-tw.tech/api/session | jq

echo -e "\n=== Step 3: Access admin API ==="
curl -s -b $COOKIE_FILE https://exportapp-tw.tech/api/admin/stats | jq

rm -f $COOKIE_FILE
