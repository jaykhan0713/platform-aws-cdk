import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import { resolveSsmParamPathArnWildcard } from 'lib/config/naming'
import { ParamNamespace } from 'lib/config/domain/param-namespace'

export class EcsServicesCommonStack extends BaseStack {

    public readonly ssmReadCoreManagedPolicy: iam.IManagedPolicy

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

        const {envConfig} = props

        this.templateOptions.description =
            'Shared resources for ecs services, i.e managed policies'

        //service related

        this.ssmReadCoreManagedPolicy = new iam.ManagedPolicy(this, 'SsmReadCoreParameterManagedPolicy', {
            statements: [
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
            ]
        })

        //service pipeline related
    }
}