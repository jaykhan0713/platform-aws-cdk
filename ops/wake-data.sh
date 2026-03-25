#!/usr/bin/env bash
set -euo pipefail

npm run cdk:data -- deploy '*Rds' \
  --require-approval never