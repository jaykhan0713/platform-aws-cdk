import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import {Construct} from 'constructs'

import * as logs from 'aws-cdk-lib/aws-logs'
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {BaseStackProps} from 'lib/stacks/base-stack'

interface PlatformEcsRollingServiceProps extends BaseStackProps {
    fargateTaskDef: ecs.FargateTaskDefinition
    desiredCount?: number,
    securityGroups: ec2.ISecurityGroup[] //sg's for task
    healthCheckGracePeriodSeconds?: number

    //service connect needed for as service as
    serviceConnectServerMode?: {
        appPortName: string //'http'
    }

    //network
    privateIsolatedSubnets: ec2.ISubnet[]

    //service runtime
    serviceName: PlatformServiceName
    cluster: ecs.ICluster
    httpNamespaceName: string
}

export class PlatformEcsRollingService extends Construct {
    public readonly fargateService: ecs.FargateService

    constructor(
        scope: Construct,
        id: string,
        props: PlatformEcsRollingServiceProps
    ) {
        super(scope, id);

        const { cluster, httpNamespaceName, serviceName } = props
        const { projectName, envName } = props.envConfig

        //TODO add access logs to check per request
        const scLogDriver = ecs.LogDrivers.awsLogs({
            streamPrefix: 'ecs',
            logGroup: new logs.LogGroup(this, 'ServiceConnectLogGroup', {
                logGroupName: `/ecs/${projectName}/${envName}/${serviceName}-service-connect`,
                retention: logs.RetentionDays.ONE_DAY,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            })
        })

        const scConfig: ecs.ServiceConnectProps = props.serviceConnectServerMode
            ? { //server + client mode
                namespace: httpNamespaceName,
                services: [
                    {
                        portMappingName: props.serviceConnectServerMode.appPortName,
                        discoveryName: serviceName,
                        dnsName: serviceName, //clients can use http://<serviceName>:8080
                    },
                ],
                logDriver: scLogDriver
            }
            : { //client mode only
                namespace: httpNamespaceName,
                logDriver: scLogDriver
            }

        const healthCheckGp =  props.healthCheckGracePeriodSeconds
            ? { healthCheckGracePeriod: cdk.Duration.seconds(props.healthCheckGracePeriodSeconds) }
            : {}

        this.fargateService = new ecs.FargateService(this, 'FargateService', {
            serviceName,
            taskDefinition: props.fargateTaskDef,
            cluster,
            desiredCount: props.desiredCount ?? 1,
            assignPublicIp: false,
            vpcSubnets: {
                subnets: props.privateIsolatedSubnets
            },
            securityGroups: props.securityGroups,
            ...healthCheckGp,
            serviceConnectConfiguration: scConfig,
            circuitBreaker: {
                enable: true,
                rollback: true
            },
            enableExecuteCommand: true, //enable ecs exec
            minHealthyPercent: 100,
            maxHealthyPercent: 200
        })

        //auto scaling
        const scaling = this.fargateService.autoScaleTaskCount({
            // minCapacity is 0 to allow manual scale-to-zero in dev environments.
            // Target tracking on CPU will not automatically scale to zero.
            minCapacity: 0,
            maxCapacity: 6
        })

        scaling.scaleOnCpuUtilization('CpuTargetTracking', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(180),
            scaleOutCooldown: cdk.Duration.seconds(60)
        })
    }

}