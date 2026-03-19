## Adding a microservice

1. Template this project: [platform-service](https://github.com/jaykhan0713/platform-service)
2. Rename all occurrences of "service-template" to your new service name ex: "edge-service"
3. On CDK project's platform-service-registry.ts, simply add in a key value pair one-liner into PlatformService object: edgeService: 'edge-service'
4. By default, the service will be in service connect client + server mode, but you can choose to put it behind an ALB
   with only service connect client mode. Simply choose exposure: 'alb'
5. Run: npm run cdk:cicd deploy --require-approval never 'EdgeService*'
   This automates: ECR repo, CodeArtifact for DTOs, published via a dto CodePipeline. CodePipeline for the microservice itself.
6. Once the above dependencies are published, trigger the execution of microservice's CodePipeline via AWS console (i.e edge-service-pipeline) that deploys your service into production.
7. You now have a fully standardized and secure ECS fargate microservice deployed in your vpc private subnet. All it took was a line of CDK code!
8. Start working on your business-layer use cases for the microservice.
9. K6 Load tester with Cognito OAuth2 and Client Credentials in front of an Http API gateway invoked by a lambda, so you can see AWS xray traces, Cloudwatch logs, Grafana light up
   under synthetic traffic.

Note: By default for a portfolio, taskdef is using the cheapest ECS resources (with scaling and health checks in place).
These mem/cpu resources are overridable and
distributed between your app, adot collector sidecar, and envoy sidecar (handled by ECS Service Connect)