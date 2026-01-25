import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { VpcImports } from 'lib/config/imports/vpc-imports'
import { Tags } from 'aws-cdk-lib'
import {resolveSecurityGroupName, resolveVpceNameTag} from 'lib/config/naming'
import { InterfaceVpceConstruct } from 'lib/constructs/vpc/interface-vpce-construct'
import {VpceServiceName} from 'lib/config/domain/vpce-service-name'
import {EnvConfig} from 'lib/config/env/env-config'

export class VpcEndpointsStack extends BaseStack {

    private readonly interfaceEndpoints: ReadonlyArray<{
        id: string
        service: ec2.IInterfaceVpcEndpointService
        name: VpceServiceName,
        enabled?: (cfg: EnvConfig) => boolean
    }> = [
        {   id: 'EcrApiVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
            name: VpceServiceName.ecrApi
        },
        {
            id: 'EcrDkrVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            name: VpceServiceName.ecrDkr
        },
        {
            id: 'CloudWatchLogsVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            name: VpceServiceName.logs
        },
        {
            id: 'ApsWorkspacesVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.PROMETHEUS_WORKSPACES,
            name: VpceServiceName.apsWorkspaces
        },
        {
            id: 'XrayVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.XRAY,
            name: VpceServiceName.xray
        },
        {
            id: 'SsmVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.SSM,
            name: VpceServiceName.ssm
        },
        {
            id: 'SsmMessagesVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
            name: VpceServiceName.ssmMessages,
            enabled: cfg => VpcEndpointsStack.ecsExecEndpointsEnabled(cfg)
        },
        {
            id: 'Ec2MessagesVpcEndpoint',
            service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
            name: VpceServiceName.ec2Messages,
            enabled: cfg => VpcEndpointsStack.ecsExecEndpointsEnabled(cfg)
        }
    ] as const

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

        const interfaceOptions = this.envConfig.vpceConfig?.interfaceOptions

        const vpc = VpcImports.vpc(this, this.envConfig)

        //sg
        const sg = new ec2.SecurityGroup(this, 'VpcEndpointSecurityGroup', {
            vpc,
            description: 'Allow HTTPS to interface VPCEs',
            allowAllOutbound: true
        })

        sg.addIngressRule(
            ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(443),
            'Allow HTTPS from inside VPC'
        )

        Tags.of(sg).add('Name', resolveSecurityGroupName(this.envConfig, this.stackDomain))

        // vpc interface endpoints

        const privateSubnetIds = VpcImports.privateSubnetIds(this.envConfig)
        if (privateSubnetIds.length === 0) throw new Error('No private subnet IDs found')

        const privateRouteTableId = VpcImports.privateRouteTableId(this.envConfig)

        const basePrivateInterfaceVpceProps = {
            vpc,
            privateDnsEnabled: true,
            subnetIds: interfaceOptions?.enableMultiAz ? privateSubnetIds : [privateSubnetIds[0]],
            routeTableId: privateRouteTableId,
            securityGroups: [sg]
        }

        const defaultEnabled = VpcEndpointsStack.interfaceEndpointsEnabled(this.envConfig)

        for (const ep of this.interfaceEndpoints) {
            const isEnabled = ep.enabled?.(this.envConfig)
                ?? defaultEnabled

            if (isEnabled) {
                new InterfaceVpceConstruct(this, ep.id, {
                    ...basePrivateInterfaceVpceProps,
                    service: ep.service,
                    nameTag: resolveVpceNameTag(this.envConfig, ep.name)
                })
            }
        }

        //gateway endpoints
        const gatewaySubnets = privateSubnetIds.map((subnetId, idx) =>
            ec2.Subnet.fromSubnetAttributes(this, `GatewaySubnet${idx}`, {
                subnetId,
                routeTableId: privateRouteTableId
            })
        )

        const s3Gateway = vpc.addGatewayEndpoint('S3GatewayVpcEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [{ subnets: gatewaySubnets }]
        })

        s3Gateway.addToPolicy(new iam.PolicyStatement({
            sid: 'AllowS3ViaEndpoint',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['s3:*'],
            resources: ['*']
        }))

        Tags.of(s3Gateway).add(
            'Name',
            resolveVpceNameTag(this.envConfig, VpceServiceName.s3Gateway)
        )
    }

    private static interfaceEndpointsEnabled(cfg: EnvConfig): boolean {
        return cfg.vpceConfig?.interfaceOptions.enableEndpoints === true
    }

    private static ecsExecEndpointsEnabled(cfg: EnvConfig): boolean {
        return this.interfaceEndpointsEnabled(cfg) &&
            cfg.vpceConfig?.interfaceOptions.enableEcsExec === true
    }
}