#!/usr/bin/env bash

set -euo pipefail

CLUSTER="jay-platform-cluster-prod"
SERVICES=("edge-service" "voyager-service" "apollo-service" "gotenberg-service")

echo "Setting min count to 0 on gotenberg"

aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/$CLUSTER/"gotenberg-service" \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 0 \
  --max-capacity 6


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

echo "Disabling Container Insights..."
npm run cdk:service-runtime -- deploy ServiceRuntime \
  --require-approval never

echo "All services are now asleep zzzz"
