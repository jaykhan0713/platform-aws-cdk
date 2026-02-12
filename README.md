# platform-aws-cdk
CDK For jay.platform AWS architecture

---

first installation- do NOT use npm install or it mutates package-lock.json
```
npm ci
```

aws sso login example:

```
aws sso configure
```

```
aws sso login --profile jay-prod 
```

windows
```
$env:AWS_PROFILE="jay-prod"
```

unix
```

```

for running different ownership boundaries (scripts in package.json) ex:
```
npm run cdk:services -- diff
npm run cdk:network -- deploy NetworkStackName
npm run cdk:cicd -- deploy
npm run cdk:core -- deploy
```

migration of existing stacks:
jay-platform-observability-prod is example stack name
$env:AWS_PROFILE="jay-prod"
jay-prod is example profile, AWS SDK must be told which profile to use

```
npx cdk deploy Network
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