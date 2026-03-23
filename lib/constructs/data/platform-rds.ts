import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import {Construct} from 'constructs'
import {BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformServiceName, PlatformServiceResource} from 'lib/config/service/platform-service-registry'
import {resolveSecretName} from 'lib/config/naming'
import {ParamNamespace, StackDomain} from 'lib/config/domain'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'

export interface PlatformRdsProps extends BaseStackProps {
    stackDomain: StackDomain
    serviceName: PlatformServiceName
    userName: string
    vpc: ec2.IVpc
    upstreamSecurityGroup: ec2.ISecurityGroup // 1:1 design, one service owns one rds db instance
}

export class PlatformRds extends Construct {

    constructor(
        scope: Construct,
        id: string,
        props: PlatformRdsProps
    ) {
        super(scope, id)

        const {
            envConfig, upstreamSecurityGroup, stackDomain, serviceName, userName, vpc
        } = props
        const databaseName = `${serviceName.replace(/-/g, '_')}_db`

        const rdsSg = new ec2.SecurityGroup(this,  `RdsSecurityGroup`, {
            securityGroupName: `${envConfig.projectName}-${stackDomain}-sg-${envConfig.envName}`,
            vpc,
            description: `Unique rds SG`,
            allowAllOutbound: false
        })

        rdsSg.addIngressRule(
            upstreamSecurityGroup,
            ec2.Port.tcp(5432),
            `allow ingress from ${serviceName} to ${databaseName} on RDS`
        )

        //note that RDS already enforces SSL by default without any parameter groups
        const rdsDb = new rds.DatabaseInstance(this,  `RdsDbInstance`, {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_18_1
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T4G,
                ec2.InstanceSize.MICRO
            ),
            vpc,
            vpcSubnets: { subnets: NetworkImports.privateIsolatedSubnets(this, envConfig) },
            securityGroups: [rdsSg],
            credentials: rds.Credentials.fromGeneratedSecret(userName, {
                secretName: `${resolveSecretName(envConfig, ParamNamespace.services, serviceName, PlatformServiceResource.rds)}`
            }),
            multiAz: false,
            allocatedStorage: 20,
            storageType: rds.StorageType.GP2,
            deletionProtection: false, // real-production, would be true
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            databaseName
        })

    }
}