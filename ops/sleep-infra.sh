#!/usr/bin/env bash
set -euo pipefail

npm run cdk:network -- deploy VpcEndpoints \
  --exclusively \
  --require-approval never \
  -c sleepMode=true

npm run cdk:network -- destroy Nat --force --exclusively