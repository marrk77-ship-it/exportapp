#!/bin/bash

# Login as client1
echo "=== Logging in as client1 ==="
LOGIN_RESPONSE=$(curl -s -c client-cookies.txt -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"client1","password":"password123"}')

echo "Login Response: $LOGIN_RESPONSE"

# Upload CSV with a new file name
echo -e "\n=== Uploading new CSV file ==="
UPLOAD_RESPONSE=$(curl -s -b client-cookies.txt -X POST http://localhost:3000/api/csv/upload \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "新しいファイル.csv",
    "rows": [
      {"名前": "田中", "年齢": "30", "住所": "東京"},
      {"名前": "佐藤", "年齢": "25", "住所": "大阪"},
      {"名前": "鈴木", "年齢": "35", "住所": "名古屋"}
    ]
  }')

echo "Upload Response: $UPLOAD_RESPONSE"

# Check upload history
echo -e "\n=== Checking csv_uploads table ==="
cd /home/user/webapp && npx wrangler d1 execute webapp-production --local --command="SELECT * FROM csv_uploads ORDER BY uploaded_at DESC LIMIT 5;" 2>/dev/null | grep -A30 "results"
