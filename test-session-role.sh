#!/bin/bash

# Login and save cookies
COOKIE_FILE=$(mktemp)

echo "=== Login as admin ==="
curl -s -c $COOKIE_FILE -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"admin","password":"admin2024"}' | jq

echo -e "\n=== Check session with role ==="
curl -s -b $COOKIE_FILE http://localhost:3000/api/session | jq

rm -f $COOKIE_FILE
