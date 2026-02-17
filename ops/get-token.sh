#!/usr/bin/env bash

set -euo pipefail

COGNITO_DOMAIN='https://jay-platform-prod-auth.auth.us-west-2.amazoncognito.com'
CLIENT_ID='4j375k0e7ju0pf4qa6ndr78687'
CLIENT_SECRET='175hhabetgdsh2r3n8tvajq7vvaaoed9fi0trg22n5f8h1j5sivh'
SCOPE='synth/invoke'

echo "Requesting access token..."

TOKEN_RESPONSE=$(curl -sS -X POST "$COGNITO_DOMAIN/oauth2/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode "scope=$SCOPE")

echo "$TOKEN_RESPONSE"
