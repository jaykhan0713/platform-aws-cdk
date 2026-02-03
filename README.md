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

migration of existing stacks:
jay-platform-observability-prod is example stack name
$env:AWS_PROFILE="jay-prod"
jay-prod is example profile, AWS SDK must be told which profile to use

```
$env:AWS_PROFILE="jay-prod"
```

```
npx cdk deploy jay-platform-observability-prod       
```

```
cdk migrate --from-stack --stack-name jay-platform-network-endpoints-prod --language typescript --output-path .\_migrate
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
      internal-alb-service-stack.ts
      wallet-service-stack.ts
  constructs/
    adot-sidecar-construct.ts
    ecs-service-construct.ts
  config/
    ssm/
    naming/
``` Sane model