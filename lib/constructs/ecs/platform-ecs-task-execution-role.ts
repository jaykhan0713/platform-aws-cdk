import * as iam from 'aws-cdk-lib/aws-iam'
import {Construct} from 'constructs'

import {
    resolveIamRoleName, resolveSsmParamPathArnWildcard
} from 'lib/config/naming'
import {IamConstants} from 'lib/config/domain/iam-constants'
import {PlatformServiceProps} from 'lib/stacks/props/platform-service-props'
import {ParamNamespace} from 'lib/config/domain/param-namespace'

export class PlatformEcsTaskExecutionRole extends Construct {

    public readonly taskExecutionRole: iam.Role

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformServiceProps
    ) {
        super(scope, id)

        const { envConfig, stackDomain } = props

        this.taskExecutionRole = new iam.Role(this,  'IamTaskExecutionRole', {
            roleName: resolveIamRoleName(envConfig, stackDomain, IamConstants.roleArea.ecsTaskExecution),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.ecsTasks),
            managedPolicies: [
                iam.ManagedPolicy
                    .fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
            ]
        })

        this.taskExecutionRole.addToPolicy(new iam.PolicyStatement({
            sid: 'ReadParameters',
            actions: [
                'ssm:GetParameter',
                'ssm:GetParameters',
                'ssm:GetParametersByPath'
            ],
            resources: [
                resolveSsmParamPathArnWildcard(props.envConfig, ParamNamespace.core)
            ]
        }))

    }
}