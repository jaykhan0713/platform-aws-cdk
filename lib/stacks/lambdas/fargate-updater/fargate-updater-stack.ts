import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as schedulerTargets from 'aws-cdk-lib/aws-scheduler-targets';
import path from 'path'
import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { ServiceRuntimeImports } from 'lib/config/dependency/service-runtime/service-runtime-imports'
import { FargateImports } from 'lib/config/dependency/fargate/fargate-imports'

export interface FargateUpdaterStackProps extends BaseStackProps {
    serviceName: PlatformServiceName
}

export class FargateUpdaterStack extends BaseStack {
    constructor(construct: cdk.App, id: string, props: FargateUpdaterStackProps) {
        super(construct, id, props)

        const { envConfig, serviceName } = props
        const { projectName, envName, region, account } = envConfig

        const fargateServiceArn = FargateImports.serviceArn(serviceName, envConfig)
        const clusterName = ServiceRuntimeImports.ecsClusterName(envConfig)

        const lambdaFn = new lambdaNodejs.NodejsFunction(this, 'FargateUpdaterLambdaFn', {
            functionName: `${projectName}-${serviceName}-updater-${envName}`,
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, 'function/invoke-fargate-updater.ts'),
            timeout: cdk.Duration.seconds(15),
            environment: {
                SERVICE_ARN: fargateServiceArn,
                RESOURCE_ID: `service/${clusterName}/${serviceName}`,
                CLUSTER_NAME: clusterName,
                SERVICE_NAME: serviceName,
            }
        })

        lambdaFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'ecs:UpdateService',
                'application-autoscaling:RegisterScalableTarget',
            ],
            resources: [
                fargateServiceArn,
                `arn:aws:application-autoscaling:${region}:${account}:scalable-target/*`
            ],
        }));

        new scheduler.Schedule(this, 'StartBusinessHoursScheduler', {
            schedule: scheduler.ScheduleExpression.cron({
                hour: '6',
                minute: '0',
                weekDay: 'MON-FRI',
                timeZone: cdk.TimeZone.AMERICA_LOS_ANGELES //Handles DST automatically.
            }),
            target: new schedulerTargets.LambdaInvoke(lambdaFn, {
                input: scheduler.ScheduleTargetInput.fromObject({
                    isBusinessHours: true
                })
            })
        })

        new scheduler.Schedule(this, 'EndBusinessHoursScheduler', {
            schedule: scheduler.ScheduleExpression.cron({
                hour: '18',
                minute: '0',
                weekDay: 'MON-FRI',
                timeZone: cdk.TimeZone.AMERICA_LOS_ANGELES //Handles DST automatically.
            }),
            target: new schedulerTargets.LambdaInvoke(lambdaFn, {
                input: scheduler.ScheduleTargetInput.fromObject({
                    isBusinessHours: false
                })
            })
        })
    }
}