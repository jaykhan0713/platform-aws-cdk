import * as iam from 'aws-cdk-lib/aws-iam'
import {Construct} from 'constructs'

import {
    resolveIamRoleName
} from 'lib/config/naming'
import {IamConstants} from 'lib/config/domain/iam-constants'
import {PlatformServiceProps} from 'lib/stacks/props/platform-service-props'

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

        for (const policy of props.runtime.taskExecPolicies) {
            this.taskExecutionRole.addManagedPolicy(policy)
        }

    }
}