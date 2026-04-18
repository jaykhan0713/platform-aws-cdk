#!/usr/bin/env bash

set -euo pipefail

echo "=== AWAKE MODE INITIATED ==="

echo "Step 1: Creating VPC Interface endpoints and NAT..."
./ops/wake-infra.sh

echo "Step 2: Creating Data Resources..."
./ops/wake-data.sh

echo "Step 3: Scaling UP ECS services..."
./ops/wake-services.sh

echo "=== Environment is now awake ==="
