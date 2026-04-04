## Ownership app/stack boundaries for deploying stacks, Full portability and reproducibility on a fresh AWS account

To change project name refer to env-config.ts

The stack boundaries, in order of cdk app deployment on a fresh AWS account are \<area\>
For every \<area\> below, in order.
```
npm run cdk:<area> -- deploy --require-approval never --all
```

\<area\> in order of deployment
```
network: VPC, VPC endpoints, VPC Link
observability: Grafana, Prometheus workspaces
service-runtime: ECS Cluster, Service Connect Http namespace, ECS shared membership security group
data: RDS, DynamoDB, Redis
gateway: Cognito, services have dependency on jwks for security
cicd: - ECR repos for service apps, foundation (k6 load testing, adot collector, base-images, etc)
      - CodePipelines for foundations (image push to above ECR repos)
      - CodePipelines for services owned DTO publishing to CodeArtifact
      - CodePipelines for services, source/build/deploy
      - edge services can have ALB that use route53 custom domains + cert for TLS termination
gateway: Http API gateway
```

\<area\> that are handled by Codepipeline and use cdk deploy (sources this project).

```
services: ECS Tasks on ECS Fargate Service behind ALB or service connect server-mode envoy sidecar 
load-test: K6 runner and Lambda that invokes runner with optional params via ops/load-test.sh or AWS UI/cli
```

Note: before executing service CodePipelines, ensure DTO pipelines have successfully passed and published.

---