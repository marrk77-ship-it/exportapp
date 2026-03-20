#!/bin/bash

# Login as admin and get session cookie
COOKIE_FILE=$(mktemp)
curl -s -c $COOKIE_FILE -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"admin","password":"admin2024"}' > /dev/null

echo "=== Admin Stats ==="
curl -s -b $COOKIE_FILE http://localhost:3000/api/admin/stats | jq

echo -e "\n=== Admin Users List ==="
curl -s -b $COOKIE_FILE http://localhost:3000/api/admin/users | jq '.users[] | {id, login_id, name, role, csv_count}'

rm -f $COOKIE_FILE
