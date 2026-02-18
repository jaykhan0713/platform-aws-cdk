#!/usr/bin/env bash
set -euo pipefail

export COGNITO_DOMAIN='https://jay-platform-prod-auth.auth.us-west-2.amazoncognito.com'
export COGNITO_CLIENT_ID='4j375k0e7ju0pf4qa6ndr78687'
export COGNITO_CLIENT_SECRET='175hhabetgdsh2r3n8tvajq7vvaaoed9fi0trg22n5f8h1j5sivh'
export COGNITO_SCOPE='synth/invoke'

export TARGET_URL='https://t8e1fuqo80.execute-api.us-west-2.amazonaws.com/synth/api/v1/experiments'


k6 run ./scripts/load-test.js