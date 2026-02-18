#!/usr/bin/env bash

set -euo pipefail

COGNITO_DOMAIN='https://jay-platform-prod-auth.auth.us-west-2.amazoncognito.com'
CLIENT_ID='CLIENT_ID'
CLIENT_SECRET='CLIENT_SECRET'
SCOPE='synth/invoke'

echo "Requesting access token..."

TOKEN_RESPONSE=$(curl -sS -X POST "$COGNITO_DOMAIN/oauth2/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode "scope=$SCOPE")

echo "$TOKEN_RESPONSE"
