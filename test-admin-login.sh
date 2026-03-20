#!/bin/bash

# Login and save cookies
COOKIE_FILE=$(mktemp)

echo "=== Step 1: Login as admin ==="
curl -i -c $COOKIE_FILE -X POST https://exportapp-tw.tech/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"admin","password":"admin2024"}' 2>&1 | grep -E "HTTP|Set-Cookie|success"

echo -e "\n=== Step 2: Check session ==="
curl -b $COOKIE_FILE https://exportapp-tw.tech/api/session 2>&1 | tail -5

echo -e "\n=== Step 3: Access admin stats ==="
curl -b $COOKIE_FILE https://exportapp-tw.tech/api/admin/stats 2>&1 | tail -5

rm -f $COOKIE_FILE
