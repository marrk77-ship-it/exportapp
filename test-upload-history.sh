#!/bin/bash

# Login as client1
echo "=== Logging in as client1 ==="
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"client1","password":"password123"}')

echo "Login Response: $LOGIN_RESPONSE"

# Upload CSV
echo -e "\n=== Uploading CSV ==="
UPLOAD_RESPONSE=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/csv/upload \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "テストファイル.csv",
    "rows": [
      {"列1": "値1", "列2": "値2", "列3": "値3"},
      {"列1": "値4", "列2": "値5", "列3": "値6"},
      {"列1": "値7", "列2": "値8", "列3": "値9"}
    ]
  }')

echo "Upload Response: $UPLOAD_RESPONSE"
