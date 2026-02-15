#!/usr/bin/env bash

set -euo pipefail

echo "=== AWAKE MODE INITIATED ==="

echo "Step 1: Creating VPC Interface endpoints..."
./ops/wake-infra.sh

echo "Step 2: Scaling UP ECS services..."
./ops/wake-services.sh

echo "=== Environment is now awake ==="
