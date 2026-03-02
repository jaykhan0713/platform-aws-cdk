# platform-aws-cdk

IaC CDK project for a fully portable, fully reproducible platform AWS architecture end-to-end. 

For my standardized microservice, refer to github repo: [platform-service](https://github.com/jaykhan0713/platform-service)

---
## About this project

This CDK project serves as a part of my portfolio to demonstrate my skills in developing an entire portable, secure AWS architecture end-to-end for a single account
with clear ownership boundaries of cloudformation stacks. 

Note: To mitigate costs for the portfolio, a single account is used with only "prod" environment in mind. This project is able to be tweaked for single account multi-env (test, prod, etc) as well as
multi account (test, prod, etc). CICD for single account is emulated under a "tools" environment but can also move to multi-account.

The stack boundaries, in order of cdk app deployment on a fresh AWS account are these \<area\>'s

```
npm run cdk:\<area\> -- deploy --require-approval never --all
```

if working on existing project

```
npm run cdk:\<area\> -- deploy <StackId>
```

\<area\>'s in order of deployment
```
network: VPC, VPC endpoints, VPC Link
observability: Grafana, Prometheus workspaces
service-runtime: ECS Cluster, Service Connect Http namespace, ECS shared membership security group
cicd: - ECR repos for service apps, foundation (k6 load testing, adot collector, base-images, etc)
      - CodePipelines for foundations (image push to above ECR repos)
      - CodePipelines for services owned DTO publishing to CodeArtifact
      - CodePipelines for services, source/build/deploy
gateway: Cognito, Http API gateway
```

\<area\>'s that are handled by Codepipeline and use cdk deploy (sources this project).

```
services: ECS Tasks on ECS Fargate Service behind ALB or service connect server-mode envoy sidecar 
load-test: K6 runner and Lambda that invokes runner with optional params via ops/load-test.sh or AWS UI/cli
```

Simplified workflow intent: 

```

K6 Cognito authroized synthetic traffic -> 
Http API gateway (via VPC link) -> 
VPC private subnet ALBs in front of microservice -> 
other microservices (service connect) or AWS resources

```


