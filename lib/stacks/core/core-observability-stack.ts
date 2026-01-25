import * as cdk from 'aws-cdk-lib'
import * as aps from 'aws-cdk-lib/aws-aps'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import { TagKeys, resolveSsmParamPath } from 'lib/config/naming';
import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { ParamNamespace } from 'lib/config/domain'

/**
 * Observability: AMP (prometheus) workspace + shared outputs for ADOT per-task sidecars
 */
export class CoreObservabilityStack extends BaseStack {

    public readonly ampWorkspaceId: string
    public readonly ampWorkspaceArn: string
    public readonly ampPrometheusEndpoint: string
    public readonly ampRemoteWriteEndpoint: string
    public readonly ampQueryEndpoint: string

    private readonly paramNamespace = ParamNamespace.core

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

        this.templateOptions.description =
            `${this.envConfig.projectName} observability: SSM + AMP (prometheus) workspace + shared outputs for ADOT per-task sidecars`

        // Resources
        const aliasName = `${this.envConfig.projectName}-amp-${this.envConfig.envName}`

        const ampWorkspace = new aps.CfnWorkspace(this, 'AmpWorkspace', {
            alias: `${aliasName}`
        })
        cdk.Tags.of(ampWorkspace).add(
            TagKeys.Name,
            `${aliasName}`
        )

        //Outputs with exports
        this.ampWorkspaceArn = ampWorkspace.attrArn
        new ssm.StringParameter(this, 'AmpWorkspaceArnParam', {
            parameterName: resolveSsmParamPath(this.envConfig, this.paramNamespace, this.stackDomain, 'amp/workspace-arn'),
            description: 'AMP workspace ARN for IAM policies',
            stringValue: this.ampWorkspaceArn,
        })
        new cdk.CfnOutput(this, 'CfnOutputAmpWorkspaceArn', {
            key: 'AmpWorkspaceArn',
            description: 'AMP workspace ARN (useful for IAM policies)',
            value: this.ampWorkspaceArn.toString(),
        })

        this.ampRemoteWriteEndpoint = cdk.Fn.sub('${URL}api/v1/remote_write', {
            URL: ampWorkspace.attrPrometheusEndpoint,
        })
        new ssm.StringParameter(this, 'AmpRemoteWriteEndpointParam', {
            parameterName: resolveSsmParamPath(this.envConfig, this.paramNamespace, this.stackDomain, 'amp/remote-write-endpoint'),
            description: 'AMP remote_write endpoint for ADOT collectors',
            stringValue: this.ampRemoteWriteEndpoint,
        })
        new cdk.CfnOutput(this, 'CfnOutputAmpRemoteWriteEndpoint', {
            key: 'AmpRemoteWriteEndpoint',
            description: 'ADOT remote_write endpoint for metrics ingestion',
            value: this.ampRemoteWriteEndpoint.toString(),
        })

        //Outputs without exports, only for cfn for visibility
        this.ampWorkspaceId = ampWorkspace.attrWorkspaceId
        new cdk.CfnOutput(this, 'CfnOutputAmpWorkspaceId', {
            key: 'AmpWorkspaceId',
            description: 'Workspace ID (ws-...) for URL paths',
            value: this.ampWorkspaceId.toString(),
        })

        this.ampPrometheusEndpoint = cdk.Fn.sub('${URL}api/v1/', {
            URL: ampWorkspace.attrPrometheusEndpoint,
        })
        new cdk.CfnOutput(this, 'CfnOutputAmpPrometheusEndpoint', {
            key: 'AmpPrometheusEndpoint',
            description: 'AMP Prometheus endpoint (ends with /api/v1/)',
            value: this.ampPrometheusEndpoint.toString(),
        })

        this.ampQueryEndpoint = cdk.Fn.sub(
            'https://aps-workspaces.${AWS::Region}.amazonaws.com/workspaces/${WsId}',
            { WsId: ampWorkspace.attrWorkspaceId }
        )
        new cdk.CfnOutput(this, 'CfnOutputAmpQueryEndpoint', {
            key: 'AmpQueryEndpoint',
            description: 'Grafana Prometheus datasource base URL (SigV4)',
            value: this.ampQueryEndpoint.toString(),
        })
    }
}
