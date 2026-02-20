import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

import { resolveIamRoleName } from 'lib/config/naming'
import {resolveSsmParamPathArnWildcard} from 'lib/config/naming/ssm-paths'
import {ParamNamespace} from 'lib/config/domain/param-namespace'
import {IamConstants} from 'lib/config/domain/iam-constants'
import {BaseStackProps} from 'lib/stacks/base-stack'

export interface PlatformEcsTaskRoleProps extends BaseStackProps {
    apsWorkspaceArn: string
}

export class PlatformEcsTaskRole extends Construct {

    public readonly taskRole: iam.Role

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformEcsTaskRoleProps
    ) {
        super(scope, id)

        const envConfig = props.envConfig
        const stackDomain = props.stackDomain

        this.taskRole = new iam.Role(this, 'RuntimeServiceTaskRole', {
            roleName: resolveIamRoleName(envConfig, stackDomain, IamConstants.roleArea.ecsTask),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.ecsTasks)
        })

        this.taskRole.addToPolicy(
            new iam.PolicyStatement({
                sid: 'ReadParameters',
                actions: [
                    'ssm:GetParameter',
                    'ssm:GetParameters',
                    'ssm:GetParametersByPath'
                ],
                resources: [
                    resolveSsmParamPathArnWildcard(envConfig, ParamNamespace.services),
                    resolveSsmParamPathArnWildcard(envConfig, ParamNamespace.core)
                ]
            })
        )

        // APS RemoteWrite
        this.taskRole.addToPolicy(
            new iam.PolicyStatement({
                sid: 'ApsRemoteWrite',
                actions: ['aps:RemoteWrite'],
                resources: [
                    props.apsWorkspaceArn
                ]
            })
        )

        // ECS Exec via SSM Messages
        this.taskRole.addToPolicy(
            new iam.PolicyStatement({
                sid: 'EcsExecSsmMessages',
                actions: [
                    'ssmmessages:CreateControlChannel',
                    'ssmmessages:CreateDataChannel',
                    'ssmmessages:OpenControlChannel',
                    'ssmmessages:OpenDataChannel'
                ],
                resources: ['*']
            })
        )

        // X-Ray write only
        this.taskRole.addToPolicy(
            new iam.PolicyStatement({
                sid: 'XrayWriteOnly',
                actions: [
                    'xray:PutTraceSegments',
                    'xray:PutTelemetryRecords',
                    'xray:GetSamplingRules',
                    'xray:GetSamplingTargets',
                    'xray:GetSamplingStatisticSummaries'
                ],
                resources: ['*']
            })
        )
    }
}