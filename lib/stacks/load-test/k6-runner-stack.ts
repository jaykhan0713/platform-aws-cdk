import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'

import * as path from 'path'

import {BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'
import {
    resolveIamRoleName,
    resolveSsmParamPath,
    resolveSsmParamPathArnWildcard,
    resolveSsmSecretName
} from 'lib/config/naming'
import {IamConstants, ParamNamespace, StackDomain} from 'lib/config/domain'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import * as logs from 'aws-cdk-lib/aws-logs'
import {ServiceRuntimeImports} from 'lib/config/dependency/service-runtime/service-runtime-imports'

export interface K6RunnerStackProps extends BaseStackProps {
    foundationName: PlatformFoundationName
}

export class K6RunnerStack extends cdk.Stack {
    public readonly fargateTaskDef: ecs.FargateTaskDefinition
    public readonly taskExecutionRole: iam.IRole
    public readonly taskRole: iam.Role
    public readonly securityGroup: ec2.ISecurityGroup

    constructor(construct: cdk.App, id: string, props: K6RunnerStackProps) {
        super(construct, id, props);

        const imageDigestUri = this.node.tryGetContext('imageDigestUri')
        if (!imageDigestUri) {
            throw new Error('Missing context: imageDigestUri')
        }

        const { envConfig, stackDomain, foundationName } = props
        const { projectName, envName, account, region } = envConfig

        this.taskRole = new iam.Role(this, 'IamTaskRole', {
            roleName: resolveIamRoleName(envConfig, stackDomain, IamConstants.roleArea.ecsTask),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.ecsTasks)
        })

        const synthClientSecret =
            resolveSsmSecretName(envConfig, ParamNamespace.gateway, StackDomain.cognito, 'synth-client-secret')

        this.taskRole.addToPolicy(new iam.PolicyStatement({
            sid: 'GetSecret',
            actions: ['secretsmanager:GetSecretValue'],
            resources: [
                `arn:aws:secretsmanager:${region}:${account}:secret:${synthClientSecret}*`
            ]
        }))

        this.taskRole.addToPolicy(
            new iam.PolicyStatement({
                sid: 'ReadParameters',
                actions: [
                    'ssm:GetParameter',
                    'ssm:GetParameters',
                    'ssm:GetParametersByPath'
                ],
                resources: [
                    resolveSsmParamPathArnWildcard(envConfig, ParamNamespace.gateway)
                ]
            })
        )

        this.taskExecutionRole = new iam.Role(this,  'IamTaskExecutionRole', {
            roleName: resolveIamRoleName(envConfig, stackDomain, IamConstants.roleArea.ecsTaskExecution),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.ecsTasks),
            managedPolicies: [
                iam.ManagedPolicy
                    .fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
            ]
        })

        //TODO: to save cost, reuses platform VPC but this should be in a separate VPC ideally as entry is public API gateway
        const vpc = NetworkImports.vpcPublic(this, envConfig)

        this.securityGroup = new ec2.SecurityGroup(this, 'EcsTaskSecurityGroup', {
            securityGroupName: `${projectName}-${foundationName}-task-sg-${envName}`,
            vpc,
            description: `Unique service task SG`,
            allowAllOutbound: true
        })

        this.fargateTaskDef = new ecs.FargateTaskDefinition(this,  "K6RunnerFargateTaskDefinition", {
            family: `${projectName}-${foundationName}-${envName}`,
            taskRole: this.taskRole,
            executionRole: this.taskExecutionRole,
            cpu: 512,
            memoryLimitMiB: 1024,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.X86_64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
            },
            volumes: []
        })

        const containerName = PlatformFoundationName.k6Runner
        const container = this.fargateTaskDef.addContainer('K6RunnerContainer', {
            containerName: containerName,
            image: ecs.ContainerImage.fromRegistry(imageDigestUri),
            environment: {
                COGNITO_DOMAIN_URL_PARAM: resolveSsmParamPath(envConfig, ParamNamespace.gateway, StackDomain.cognito, 'domain-url'),
                COGNITO_CLIENT_ID_PARAM: resolveSsmParamPath(envConfig, ParamNamespace.gateway, StackDomain.cognito, 'synth-client-id'),
                COGNITO_SCOPE_PARAM: resolveSsmParamPath(envConfig, ParamNamespace.gateway, StackDomain.cognito, 'synth-invoke-scope'),
                API_URL_PARAM: resolveSsmParamPath(envConfig, ParamNamespace.gateway, StackDomain.api, 'api-url'),
                COGNITO_CLIENT_SECRET_NAME: resolveSsmSecretName(envConfig, ParamNamespace.gateway, StackDomain.cognito, 'synth-client-secret')
            },
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'ecs',
                logGroup: new logs.LogGroup(this, 'K6RunnerLogGroup', {
                    logGroupName: `/ecs/${projectName}/${envName}/${foundationName}`,
                    retention: logs.RetentionDays.ONE_DAY,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                })
            }),
            essential: true
        })

        const subnetIds = NetworkImports.publicSubnetIds(envConfig)
        const clusterArn = ServiceRuntimeImports.ecsClusterArn(envConfig)

        const lambdaFn = new lambdaNodejs.NodejsFunction(this, 'K6RunnerLambda', {
            functionName: `${projectName}-${foundationName}-lambda-${envName}`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, 'lambda/invoke-k6-runner.ts'),
            timeout: cdk.Duration.seconds(30),
            environment: {
                CONTAINER_NAME: containerName,
                CLUSTER_ARN: clusterArn,
                TASK_DEF_ARN: this.fargateTaskDef.taskDefinitionArn,
                SUBNET_IDS: subnetIds.join(','),
                SECURITY_GROUP_ID: this.securityGroup.securityGroupId
            }
        })

        //grants permissions to runTask for task role and exec role, as well as PassRole
        this.fargateTaskDef.grantRun(lambdaFn)
    }

}