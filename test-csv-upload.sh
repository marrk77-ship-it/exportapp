#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Step 1: Login as client1 ==="
COOKIE_FILE=$(mktemp)
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"login_id":"client1","password":"password123"}')
echo "Login response: $LOGIN_RESPONSE"

echo ""
echo "=== Step 2: Upload CSV data ==="
UPLOAD_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/csv/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [
      {"name": "テスト1", "value": "100"},
      {"name": "テスト2", "value": "200"},
      {"name": "テスト3", "value": "300"}
    ]
  }')
echo "Upload response: $UPLOAD_RESPONSE"

rm -f "$COOKIE_FILE"
