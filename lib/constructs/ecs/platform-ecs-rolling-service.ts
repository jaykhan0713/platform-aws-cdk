import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import {Construct} from 'constructs'

import type {PlatformServiceProps} from 'lib/stacks/services/props/platform-service-props'

interface PlatformEcsRollingServiceProps extends PlatformServiceProps {
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
}

export class PlatformEcsRollingService extends Construct {
    public readonly fargateService: ecs.FargateService

    constructor(
        scope: Construct,
        id: string,
        props: PlatformEcsRollingServiceProps
    ) {
        super(scope, id);

        const serviceName = props.serviceName

        const scConfig: ecs.ServiceConnectProps = props.serviceConnectServerMode
            ? { //server + client mode
                namespace: props.runtime.serviceConnectNamespace.namespaceName,
                services: [
                    {
                        portMappingName: props.serviceConnectServerMode.appPortName,
                        discoveryName: serviceName,
                        dnsName: serviceName, //clients can use http://<serviceName>:8080
                    },
                ],
            }
            : { //client mode only
                namespace: props.runtime.serviceConnectNamespace.namespaceName
            }

        const healthCheckGp =  props.healthCheckGracePeriodSeconds
            ? { healthCheckGracePeriod: cdk.Duration.seconds(props.healthCheckGracePeriodSeconds) }
            : {}

        this.fargateService = new ecs.FargateService(this, 'FargateService', {
            serviceName,
            taskDefinition: props.fargateTaskDef,
            cluster: props.runtime.cluster,
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
            minCapacity: 1,
            maxCapacity: 6
        })

        scaling.scaleOnCpuUtilization('CpuTargetTracking', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(180),
            scaleOutCooldown: cdk.Duration.seconds(60)
        })
    }

}