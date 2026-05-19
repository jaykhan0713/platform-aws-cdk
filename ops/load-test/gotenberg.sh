#!/usr/bin/env bash

aws lambda invoke \
  --function-name jay-platform-k6-runner-lambda-prod \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "vus": 1,
    "duration": "10m",
    "sleepIntervalMs": 0.05,
    "gotenberg": true
  }' \
  response.json

cat response.json
rm -f response.json

echo
read -p "Done. Press enter to close..."