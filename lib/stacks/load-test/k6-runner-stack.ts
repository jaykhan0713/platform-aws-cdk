import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as iam from 'aws-cdk-lib/aws-iam'

import {BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'
import {resolveIamRoleName, resolveSsmParamPathArnWildcard, resolveSsmSecretPath} from 'lib/config/naming'
import {IamConstants, ParamNamespace, StackDomain} from 'lib/config/domain'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import * as logs from 'aws-cdk-lib/aws-logs'

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
            resolveSsmSecretPath(envConfig, ParamNamespace.gateway, StackDomain.cognito, 'synth-client-secret')

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

        const container = this.fargateTaskDef.addContainer('K6RunnerContainer', {
            image: ecs.ContainerImage.fromRegistry(imageDigestUri),
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
    }

}