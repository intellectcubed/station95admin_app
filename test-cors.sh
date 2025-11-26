#!/bin/bash

API_URL="https://c3mp3by0h5.execute-api.us-east-1.amazonaws.com/dev"

echo "========================================="
echo "Testing CORS Configuration"
echo "========================================="
echo ""

echo "1. Testing OPTIONS preflight request..."
echo "---------------------------------------"
curl -v -X OPTIONS \
  -H "Origin: https://intellectcubed.github.io" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "${API_URL}/api" \
  2>&1 | grep -E "(< HTTP|< Access-Control|< Content-Type|statusCode)"

echo ""
echo ""
echo "2. Testing actual GET request..."
echo "---------------------------------------"
curl -v -X GET \
  -H "Origin: https://intellectcubed.github.io" \
  "${API_URL}/api?action=get_schedule_day&date=20251126" \
  2>&1 | grep -E "(< HTTP|< Access-Control|< Content-Type|error|statusCode)"

echo ""
echo ""
echo "3. Testing GET request without Origin header..."
echo "---------------------------------------"
curl -i -X GET \
  "${API_URL}/api?action=get_schedule_day&date=20251126" \
  2>&1 | head -20

