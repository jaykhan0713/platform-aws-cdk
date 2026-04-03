import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'

export interface NatStackProps extends BaseStackProps {
    vpc: ec2.IVpc
}

export class NatStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: NatStackProps) {
        super(scope, id, props)

        const { envConfig, vpc } = props
        const { projectName, envName } = envConfig

        const natInstance = new ec2.Instance(this, 'NatInstance', {
            instanceName: `${projectName}-nat-instance-${envName}`,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
            machineImage: ec2.MachineImage.latestAmazonLinux2023({
                cpuType: ec2.AmazonLinuxCpuType.ARM_64
            }),
            vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            sourceDestCheck: false, //needs to be false for instance to use NAT
        })

        const natSg = new ec2.SecurityGroup(this, 'NatInstanceSg', {
            securityGroupName: `${projectName}-nat-instance-sg-${envName}`,
            vpc,
            description: 'NAT instance SG',
            allowAllOutbound: true
        })

        natSg.addIngressRule(
            ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.allTraffic(),
            'Allow all traffic from VPC private subnets'
        )

        natInstance.addSecurityGroup(natSg)

        vpc.isolatedSubnets.forEach((subnet, index) => {
            new ec2.CfnRoute(this,  `NatRoute${index}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: '0.0.0.0/0',
                instanceId: natInstance.instanceId
            })
        })

        /*
         * Linux disables IP forwarding by default as a security measure.
         * A normal host is only supposed to send and receive packets addressed to itself.
         * Forwarding packets between interfaces (which is what NAT does) is a router/gateway behavior, not a default host behavior.
         * net.ipv4.ip_forward=1 tells the kernel "yes, forward packets between interfaces."
         * Without it the NAT instance receives the packet from your private subnet, looks at the destination IP,
         * sees it's not addressed to itself, and drops it. The iptables MASQUERADE rule then handles the address translation part:
         * rewriting the source IP to the NAT instance's public IP so responses come back correctly.
         *
         * Two separate concerns:
         * IP forwarding: kernel allows packet forwarding at all
         * MASQUERADE: rewrites source IP so the internet sees the NAT instance's IP, not your private subnet IP
         * Both required, neither is on by default.
         */

        natInstance.addUserData(
            'echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf',
            'sysctl -p',
            'yum install -y iptables-services',
            'iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE',
            'service iptables save',
        )

        /*
         * NOTE: your services hit X-Ray, APS, CloudWatch etc via the
         * VPCE automatically because DNS tells them to, they have no idea they're going through a VPCE.
         * The 0.0.0.0/0 -> NAT route only handles traffic where DNS resolves to a
         * public IP that isn't covered by an interface endpoint.
         */
    }
}