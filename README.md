# platform-aws-cdk
CDK For jay.platform AWS architecture

#TODO: add auto scaling linked role.

---

aws sso login example:

```
aws sso login --profile jay-prod 
```

```
$env:AWS_PROFILE="jay-prod"
```

---

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

---

```
lib/
  stacks/
    global/
      observability-stack.ts
      network-stack.ts
    services/
      edge-service-stack.ts
      wallet-service-stack.ts
  constructs/
    adot-sidecar-construct.ts
    ecs-service-construct.ts
  config/
    ssm/
    naming/
``` Sane model