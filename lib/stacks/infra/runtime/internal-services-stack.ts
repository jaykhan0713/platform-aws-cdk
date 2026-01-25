import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {
    resolveIamPolicyName, resolveIamRoleName, resolveExportName,
    resolveSsmParamPathArnWildcard
} from 'lib/config/naming'
import { ParamNamespace } from 'lib/config/domain/param-namespace'

export class InternalServicesStack extends BaseStack {

    public readonly taskExecutionRole: iam.Role

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

        this.templateOptions.description =
            'Shared resources internal services use i.e IAM roles+policies'

        //service related
        const servicesRoles = this.createServiceRoles()
        this.taskExecutionRole = servicesRoles.taskExecutionRole

        //service pipeline related
    }

    private createServiceRoles() {
        const taskExecutionRole = new iam.Role(this,  'InternalServicesTaskExecutionRole', {
            roleName: resolveIamRoleName(this.envConfig, this.stackDomain, 'task-execution'),
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy
                    .fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
            ]
        })

        const ssmReadPolicy = new iam.Policy(this, 'SsmParametersRead', {
            policyName: resolveIamPolicyName(this.envConfig, this.stackDomain, 'ssm-parameters-read'),
            statements: [
                new iam.PolicyStatement({
                    sid: 'ReadParameters',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ssm:GetParameter',
                        'ssm:GetParameters',
                        'ssm:GetParametersByPath'
                    ],
                    resources: [
                        resolveSsmParamPathArnWildcard(this.envConfig, ParamNamespace.core)
                    ]
                })
            ]
        })

        taskExecutionRole.attachInlinePolicy(ssmReadPolicy)

        new cdk.CfnOutput(this, `InternalServicesTaskExecutionRoleArn`, {
            value: taskExecutionRole.roleArn,
            exportName: resolveExportName(this.envConfig, this.stackDomain, 'task-execution-role-arn')
        })

        return { taskExecutionRole }
    }
}