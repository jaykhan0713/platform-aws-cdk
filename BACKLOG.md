- apigw and cognito migrated to cdk
- to simulate ownership boundaries, separate network, cicd, shared (ecr, ecs), services and use exports+imports
- Adot repo and base-images, otel-config.yaml to cdk (research best standard)
- use SSM for 'tools' account (app in this case on same account) exporting resource uri's like service + other images
- Non ALB internal services need to do their unique ecsTaskSg.addIngress(internalServicesSg) as well as register
  their fargate service with [ecsTaskSg, internalServicesSg]
- update alb to listen on 443, dont terminate TLS on API gw, instead terminate at ALB. Can keep service to service http.
- enable circuitbreaker rollback: true
- move service runtime stack objects to exports/ssm so service conditional synths dont depend on auto generated exports.