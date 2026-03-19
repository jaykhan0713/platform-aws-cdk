# platform-aws-cdk

IaC CDK project for a production-aimed portable scalable, secure, resilient, observable AWS architecture end-to-end
with clear ownership boundaries of cloudformation stacks.

Intent: 0-1, Walk into a seed-stage/start-up company. Plug and play their business use-case. Have an optimized, scalable distributed system, cost-savings, all deployed within the first hour. 

For my standardized [Spring boot 4 + Java25 + Project loom virtual threads enabled] microservices, please refer to github repo README: **[platform-service](https://github.com/jaykhan0713/platform-service)**

---
## About this project

- This CDK project serves as a part of my portfolio to demonstrate my skill-set and undersstand of end-to-end distributed systems, cloud, SDLC, and micro-services.
- I integrate my skill-set of 7 years in industry as a backend engineer at Expedia Group's Flights team updated with the most up-to-date modern industry tech standards I learned as an Independent Engineer over the year.
- To demonstrate end to end high user traffic and scalability with auth, A lambda invokes a public subnet Fargate SPOT task K6 load test with synthetic traffic to API Gateway.

---
## High level runtime workflow:

![](docs/high_level_workflowV2.png)

---
### CDK features: 
- Deploy any elb+edge or internal microservices easily. Service is fully functional wired with observability and resiliency end-to-end. Portability of defaults require adding service name to **[platform-service-registry.ts](lib/config/service/platform-service-registry.ts)** and CICD automates
the rest.
- Cost saving scripts that run cdk to destroy vpc endpoints, scale down tasks to 0, destroy stacks in order and bring them up clearly (For longer off-cloud-dev time)
---

## Index

| Section                                                                                     | Description                                                                             |
|---------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| [Ownership Stack Boundaries](docs/ownership-stack-boundaries/OWNERSHIP_STACK_BOUNDARIES.md) | gateway, network, services, runtime, obesrvability, load-test, cicd                     |
| [Observability](docs/observability/OBSERVABILITY.md)                                        | ADOT collector, X-Ray, Cloudwatch, Prometheus (APS), Grafana                            |
| [Services](docs/services/SERVICES.md)                                                       | Microservices, ECS, ELB, Service Connect                                                |
| [CICD](docs/cicd/CICD.md)                                                                   | Automation of CodePipeline, CodeBuild, CDK deploy, ECR, CodeArtifact, Github Connection |
| [Security](docs/security/SECURITY.md)                                                       | IAM scoping, Cognito, mTLS, Security Group tightening                                   |
| [Cost Design](docs/cost-design/COST_DESIGN.md)                                              | Documented savings, right-sizing rationale                                              |

---

## Status

Actively evolving as a platform foundation. Post MVP iterative work is actively on-going

---
## Contact

Please feel free to reach out and discuss anything at jaykhan0713@gmail.com

---
