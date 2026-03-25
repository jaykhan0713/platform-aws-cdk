#!/usr/bin/env bash
set -euo pipefail

npm run cdk:data -- destroy '*Rds' \
  --exclusively \
  --force