#!/usr/bin/env bash

set -euo pipefail

CLUSTER="jay-platform-cluster-prod"
#SERVICES=("edge-service" "voyager-service" "apollo-service")
SERVICES=("edge-service" "gotenberg-service")

echo "Waking up services in cluster: $CLUSTER"

echo "Enabling Container Insights..."
npm run cdk:service-runtime -- deploy ServiceRuntime \
  -c insights=true \
  --require-approval never

echo "setting mincount greater than 0 on gotenberg"

#note that autoscaling will bring up desired count to 2 immedietly
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/$CLUSTER/"gotenberg-service" \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 6

for SERVICE in "${SERVICES[@]}"; do
  echo "Scaling $SERVICE to 1..."

  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --desired-count 1 \
    >/dev/null

done

echo "Waiting for services to stabilize..."

for SERVICE in "${SERVICES[@]}"; do
  aws ecs wait services-stable \
    --cluster "$CLUSTER" \
    --services "$SERVICE"
done

echo "All services have woken"
