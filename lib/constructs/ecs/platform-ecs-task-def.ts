import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as iam from 'aws-cdk-lib/aws-iam'

import {Construct} from 'constructs'

import {TaskDefinitionConfig} from 'lib/config/taskdef/taskdef-config'
import {PlatformServiceProps} from 'lib/stacks/props/platform-service-props'

interface PlatformEcsTaskDefProps extends PlatformServiceProps {
    taskDefCfg: TaskDefinitionConfig

    taskRole: iam.IRole
    taskExecutionRole: iam.IRole

    appImage: ecs.ContainerImage //const image = ecs.ContainerImage.fromEcrRepository(repo, 'bootstrap')
}

export class PlatformEcsTaskDef extends Construct {
    public readonly fargateTaskDef: ecs.FargateTaskDefinition

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformEcsTaskDefProps
    ) {
        super(scope, id)

        const {envConfig, taskDefCfg, serviceName} = props
        const {projectName, envName} = envConfig


        this.fargateTaskDef = new ecs.FargateTaskDefinition(this,  "ServiceFargateTaskDefinition", {
            family: `${projectName}-${serviceName}-${envName}`,
            taskRole: props.taskRole,
            executionRole: props.taskExecutionRole,
            cpu: taskDefCfg.cpu,
            memoryLimitMiB: taskDefCfg.memoryMiB,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.X86_64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
            },
            volumes: []
        })

        const app = taskDefCfg.app

        this.fargateTaskDef.addContainer('AppContainer', {
            containerName: app.containerName,
            image: props.appImage,
            cpu: app.cpuUnits,
            memoryLimitMiB: app.memoryMiB,
            essential: app.essential,
            stopTimeout: cdk.Duration.seconds(app.stopTimeoutSeconds),
            portMappings: [
                {
                    containerPort: app.containerPort,
                    name: app.containerPortName,
                    protocol: ecs.Protocol.TCP
                }
            ],
            environment: app.env,
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: app.logging.streamPrefix,
                logGroup: new logs.LogGroup(this, 'AppLogGroup', {
                    logGroupName: app.logging.logGroupName,
                    retention: logs.RetentionDays.THREE_DAYS,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                })
            }),
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'kill -0 1 || exit 1' // kill -0 verifies PID 1 (the JVM) exists and can receive signals; no signal is sent
                ],
                interval: cdk.Duration.seconds(10),
                timeout: cdk.Duration.seconds(5),
                retries: 3,
                startPeriod: cdk.Duration.seconds(30), //for duration, don't count retries
            }
        })

        // adot sidecar
        const adot = taskDefCfg.adot

        this.fargateTaskDef.addContainer('AdotContainer', {
            containerName: adot.containerName,
            image: props.runtime.adotImage,
            cpu: adot.cpuUnits,
            memoryLimitMiB: adot.memoryMiB,
            essential: adot.essential,
            portMappings: [
                {
                    containerPort: adot.ports.grpc,
                    protocol: ecs.Protocol.TCP
                },
                {
                    containerPort: adot.ports.http,
                    protocol: ecs.Protocol.TCP
                }
            ],
            environment: adot.env,
            secrets: Object.fromEntries(
                Object.entries(adot.secrets).map(([envVarName, paramPath]) => [
                    envVarName,
                    ecs.Secret.fromSsmParameter(
                        ssm.StringParameter.fromStringParameterName(
                            this,
                            `Secret-${envVarName}`,
                            paramPath
                        )
                    ),
                ])
            ),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: adot.logging.streamPrefix,
                logGroup: new logs.LogGroup(this, 'AdotLogGroup', {
                    logGroupName: adot.logging.logGroupName,
                    retention: logs.RetentionDays.THREE_DAYS,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                })
            }),
        })

    }
}