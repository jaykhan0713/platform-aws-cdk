#!/usr/bin/env bash

set -euo pipefail

CLUSTER="jay-platform-cluster-prod"
SERVICES=("edge-service" "voyager-service")

echo "Putting services to sleep in cluster: $CLUSTER"

for SERVICE in "${SERVICES[@]}"; do
  echo "Scaling $SERVICE to 0..."

  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --desired-count 0 \
    >/dev/null

done

echo "Waiting for services to stabilize..."

for SERVICE in "${SERVICES[@]}"; do
  aws ecs wait services-stable \
    --cluster "$CLUSTER" \
    --services "$SERVICE"
done

echo "All services are now asleep zzzz"
