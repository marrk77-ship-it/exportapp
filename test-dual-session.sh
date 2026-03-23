#!/bin/bash

echo "=== Test 1: Login as client1 (regular user) ==="
COOKIE_FILE_CLIENT=$(mktemp)
curl -s -c "$COOKIE_FILE_CLIENT" -X POST "http://localhost:3000/api/login" \
  -H "Content-Type: application/json" \
  -d '{"login_id":"client1","password":"password123"}' | jq .

echo ""
echo "=== Test 2: Check regular session ==="
curl -s -b "$COOKIE_FILE_CLIENT" "http://localhost:3000/api/session" | jq .

echo ""
echo "=== Test 3: Login as admin (admin user) ==="
COOKIE_FILE_ADMIN=$(mktemp)
curl -s -c "$COOKIE_FILE_ADMIN" -X POST "http://localhost:3000/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"login_id":"admin","password":"admin2024"}' | jq .

echo ""
echo "=== Test 4: Check admin session ==="
curl -s -b "$COOKIE_FILE_ADMIN" "http://localhost:3000/api/admin/session" | jq .

echo ""
echo "=== Test 5: Verify both sessions work simultaneously ==="
echo "Client session:"
curl -s -b "$COOKIE_FILE_CLIENT" "http://localhost:3000/api/session" | jq -r '.user.login_id'
echo "Admin session:"
curl -s -b "$COOKIE_FILE_ADMIN" "http://localhost:3000/api/admin/session" | jq -r '.user.login_id'

rm -f "$COOKIE_FILE_CLIENT" "$COOKIE_FILE_ADMIN"
