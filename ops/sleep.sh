#!/usr/bin/env bash

set -euo pipefail

echo "=== SLEEP MODE INITIATED ==="

echo "Step 1: Scaling ECS services to 0..."
./ops/sleep-services.sh

echo "Step 2: Destroying VPC Interface endpoints..."
./ops/sleep-infra.sh

echo "=== Environment is now asleep ==="
