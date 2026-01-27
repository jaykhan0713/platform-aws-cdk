import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'

export class PlatformEcsTaskSecurityGroup extends Construct {
    public readonly securityGroup: ec2.SecurityGroup

    public constructor(
        scope: Construct,
        id: string,

    ) {
        super(scope, id)


    }
}