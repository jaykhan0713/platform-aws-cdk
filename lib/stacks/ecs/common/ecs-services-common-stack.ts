import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {
    resolveIamRoleName, resolveExportName, resolveSsmParamPathArnWildcard
} from 'lib/config/naming'
import { ParamNamespace } from 'lib/config/domain/param-namespace'
import {IamConstants} from 'lib/config/domain/iam-constants'

export class EcsServicesCommonStack extends BaseStack {

    public readonly taskExecutionRole: iam.IRole

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

        this.templateOptions.description =
            'Shared resources for ecs services, i.e IAM roles+policies'

        //service related
        const servicesRoles = this.createServiceRoles()
        this.taskExecutionRole = servicesRoles.taskExecutionRole

        //service pipeline related
    }

    private createServiceRoles() {
        const taskExecutionIamRole = new iam.Role(this,  'EcsServicesCommonTaskExecutionRole', {
            roleName: resolveIamRoleName(this.envConfig, this.stackDomain, IamConstants.roleArea.ecsTaskExecution),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.ecsTasks),
            managedPolicies: [
                iam.ManagedPolicy
                    .fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
            ]
        })

        taskExecutionIamRole.addToPolicy(
            new iam.PolicyStatement({
                sid: 'ReadParameters',
                actions: [
                    'ssm:GetParameter',
                    'ssm:GetParameters',
                    'ssm:GetParametersByPath'
                ],
                resources: [
                    resolveSsmParamPathArnWildcard(this.envConfig, ParamNamespace.core)
                ]
            })
        )

        new cdk.CfnOutput(this, `EcsServicesCommonTaskExecutionRoleArn`, {
            value: taskExecutionIamRole.roleArn,
            exportName: resolveExportName(this.envConfig, this.stackDomain, 'task-execution-role-arn')
        })

        return { taskExecutionRole: taskExecutionIamRole }
    }
}