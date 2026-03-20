#!/bin/bash

echo "=== Test 1: client1 (admin) ==="
curl -s -X POST https://exportapp-tw.tech/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"client1","password":"password123"}' | jq '.user'

echo -e "\n=== Test 2: client2 (user) ==="
curl -s -X POST https://exportapp-tw.tech/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"client2","password":"password123"}' | jq '.user'

echo -e "\n=== Test 3: admin (admin) ==="
curl -s -X POST https://exportapp-tw.tech/api/login \
  -H "Content-Type: application/json" \
  -d '{"login_id":"admin","password":"admin2024"}' | jq '.user'
