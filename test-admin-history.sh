#!/bin/bash

# Login as admin
echo "=== Logging in as admin ==="
LOGIN_RESPONSE=$(curl -s -c admin-cookies.txt -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"admin","password":"admin2024"}')

echo "Login Response: $LOGIN_RESPONSE"

# Get upload history for user 1
echo -e "\n=== Getting upload history for user 1 ==="
HISTORY_RESPONSE=$(curl -s -b admin-cookies.txt http://localhost:3000/api/admin/users/1/uploads)

echo "History Response: $HISTORY_RESPONSE"
