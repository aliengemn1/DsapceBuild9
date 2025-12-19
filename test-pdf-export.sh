#!/bin/bash
# Test script for PDF Export 25% feature

SERVER_URL="http://localhost:8080/server"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin"

echo "=== PDF Export 25% Feature Test ==="

# Step 1: Login
echo -e "\n1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/authn/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "user=${ADMIN_EMAIL}&password=${ADMIN_PASSWORD}" \
  -D - 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -i "authorization:" | awk '{print $2}' | tr -d '\r')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get auth token. Check credentials."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "Token obtained: ${TOKEN:0:20}..."

# Step 2: Find a PDF bitstream (you need to provide UUIDs)
echo -e "\n2. Testing PDF export endpoint..."
echo "   NOTE: You need to provide valid item and bitstream UUIDs"

# Example test - replace with real UUIDs
ITEM_UUID="REPLACE-WITH-ITEM-UUID"
BITSTREAM_UUID="REPLACE-WITH-PDF-BITSTREAM-UUID"

if [ "$ITEM_UUID" = "REPLACE-WITH-ITEM-UUID" ]; then
  echo -e "\n   To test, edit this script and replace:"
  echo "   - ITEM_UUID with a real item UUID"
  echo "   - BITSTREAM_UUID with a PDF bitstream UUID"
  echo ""
  echo "   You can find these by browsing the DSpace API:"
  echo "   curl '${SERVER_URL}/api/core/items?size=5'"
  exit 0
fi

# Step 3: Call PDF export
echo -e "\n3. Calling PDF export API..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SERVER_URL}/api/admin-pdf-export" \
  -H "Content-Type: application/json" \
  -H "Authorization: ${TOKEN}" \
  -d "{
    \"itemUuid\": \"${ITEM_UUID}\",
    \"bitstreamUuid\": \"${BITSTREAM_UUID}\",
    \"exportType\": \"first_25_percent\",
    \"nationalId\": \"1234567890\"
  }" \
  --output test-export.pdf 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "SUCCESS! PDF exported to test-export.pdf"
  ls -la test-export.pdf
else
  echo "ERROR: HTTP $HTTP_CODE"
  cat test-export.pdf
fi

echo -e "\n=== Test Complete ==="
