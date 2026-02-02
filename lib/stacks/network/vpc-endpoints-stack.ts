import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import { Tags } from 'aws-cdk-lib'
import {resolveSecurityGroupName, resolveVpceNameTag, TagKeys} from 'lib/config/naming'
import { PlatformInterfaceVpce } from 'lib/constructs/vpc/platform-interface-vpce'
import {VpceServiceName} from 'lib/config/domain/vpce-service-name'
import {EnvConfig} from 'lib/config/env/env-config'
import { AZ } from 'lib/config/domain'

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
        props: BaseStackProps & {
            vpc: ec2.IVpc
        }
    ) {
        super(scope, id, props)

        const interfaceOptions = this.envConfig.vpceConfig?.interfaceOptions

        const vpc = props.vpc

        //sg
        const sg = new ec2.SecurityGroup(this, 'VpcEndpointSecurityGroup', {
            securityGroupName: resolveSecurityGroupName(this.envConfig, this.stackDomain),
            vpc,
            description: 'Allow HTTPS to interface VPCEs',
            allowAllOutbound: true
        })

        sg.addIngressRule(
            ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(443),
            'Allow HTTPS from inside VPC'
        )

        // vpc interface endpoints

        if (interfaceOptions?.enableEndpoints) {

            let subnets: ec2.SubnetSelection

            if (interfaceOptions?.enableInterfaceMultiAz) {
                subnets = { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
            } else {
                const isolatedSubnets = vpc.selectSubnets({
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                }).subnets

                const singleAzSubnet = isolatedSubnets.find(
                    s => s.availabilityZone === AZ.US_WEST_2A
                )!

                subnets = { subnets: [singleAzSubnet] }
            }

            const basePrivateInterfaceVpceProps = {
                vpc,
                privateDnsEnabled: true,
                subnets: subnets,
                securityGroups: [sg]
            }

            for (const ep of this.interfaceEndpoints) {
                const isEnabled = ep.enabled?.(this.envConfig)
                    ?? true

                if (isEnabled) {
                    new PlatformInterfaceVpce(this, ep.id, {
                        ...basePrivateInterfaceVpceProps,
                        service: ep.service,
                        nameTag: resolveVpceNameTag(this.envConfig, ep.name)
                    })
                }
            }
        }

        //gateway endpoints

        const s3Gateway = vpc.addGatewayEndpoint('S3GatewayVpcEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED  }]
        })

        s3Gateway.addToPolicy(new iam.PolicyStatement({
            sid: 'AllowS3ViaEndpoint',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['s3:*'],
            resources: ['*']
        }))

        Tags.of(s3Gateway).add(
            TagKeys.Name,
            resolveVpceNameTag(this.envConfig, VpceServiceName.s3Gateway)
        )
    }

    private static ecsExecEndpointsEnabled(cfg: EnvConfig): boolean {
        return cfg.vpceConfig?.interfaceOptions.enableEcsExec === true
    }
}