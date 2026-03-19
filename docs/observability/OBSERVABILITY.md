## Observability

- Each microservice ships with a configured adot-collector, Amazon's distribution for OpenTelemetry. This configuration
  has a prometheus scraper that pushes to APS workspace, Otel traces are pushed to AWS x-ray. Retrieves ECS task metadata for APS
- CDK handles both Prometheus (APS) and Grafana workspaces.

---
Golden Signals automatically avaialble to each deployed microservice:

![grafana1.png](grafana1.png)

![grafana2.png](grafana2.png)