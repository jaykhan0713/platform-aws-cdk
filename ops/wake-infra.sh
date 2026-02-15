#!/usr/bin/env bash
set -euo pipefail

npm run cdk:network -- deploy VpcEndpoints \
  --exclusively \
  --require-approval never
