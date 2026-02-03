import * as cdk from 'aws-cdk-lib'
import * as aps from 'aws-cdk-lib/aws-aps'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import {TagKeys, resolveSsmParamPath, resolveExportName} from 'lib/config/naming';
import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { ParamNamespace } from 'lib/config/domain'

export class ObservabilityStack extends BaseStack {

    private readonly paramNamespace = ParamNamespace.core

    public readonly apsRemoteWriteEndpoint: string
    public readonly apsWorkspaceArn: string

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

        this.templateOptions.description =
            `${this.envConfig.projectName} observability: SSM + APS (prometheus) workspace + shared outputs`

        // Resources
        const aliasName = `${this.envConfig.projectName}-aps-${this.envConfig.envName}`

        const apsWorkspace = new aps.CfnWorkspace(this, 'ApsWorkspace', {
            alias: `${aliasName}`
        })
        cdk.Tags.of(apsWorkspace).add(
            TagKeys.Name,
            `${aliasName}`
        )

        //Outputs with ssm exports
        this.apsRemoteWriteEndpoint = cdk.Fn.sub('${URL}api/v1/remote_write', {
            URL: apsWorkspace.attrPrometheusEndpoint,
        })
        new ssm.StringParameter(this, 'ApsRemoteWriteEndpointParam', {
            parameterName: resolveSsmParamPath(this.envConfig, this.paramNamespace, this.stackDomain, 'aps/remote-write-endpoint'),
            description: 'APS remote_write endpoint for ADOT collectors',
            stringValue: this.apsRemoteWriteEndpoint,
        })
        new cdk.CfnOutput(this, 'CfnOutputApsRemoteWriteEndpoint', {
            key: 'ApsRemoteWriteEndpoint',
            description: 'ADOT remote_write endpoint for metrics ingestion',
            value: this.apsRemoteWriteEndpoint,
        })

        //Outputs without ssm exports, only for cfn for visibility
        this.apsWorkspaceArn = apsWorkspace.attrArn
        new cdk.CfnOutput(this, 'CfnOutputApsWorkspaceArn', {
            key: 'ApsWorkspaceArn',
            description: 'APS workspace ARN (useful for IAM policies)',
            value: this.apsWorkspaceArn,
            exportName: resolveExportName(this.envConfig, this.stackDomain, 'aps-workspace-arn')
        })

        const apsQueryEndpoint = cdk.Fn.sub(
            'https://aps-workspaces.${AWS::Region}.amazonaws.com/workspaces/${WsId}',
            { WsId: apsWorkspace.attrWorkspaceId }
        )
        new cdk.CfnOutput(this, 'CfnOutputApsQueryEndpoint', {
            key: 'ApsQueryEndpoint',
            description: 'Grafana Prometheus datasource base URL (SigV4)',
            value: apsQueryEndpoint.toString(),
            exportName: resolveExportName(this.envConfig, this.stackDomain, 'aps-workspace-query-endpoint')
        })

        const apsWorkspaceId = apsWorkspace.attrWorkspaceId
        new cdk.CfnOutput(this, 'CfnOutputApsWorkspaceId', {
            key: 'ApsWorkspaceId',
            description: 'Workspace ID (ws-...) for URL paths',
            value: apsWorkspaceId.toString(),
            exportName: resolveExportName(this.envConfig, this.stackDomain, 'aps-workspace-id')
        })

        const apsPrometheusEndpoint = cdk.Fn.sub('${URL}api/v1/', {
            URL: apsWorkspace.attrPrometheusEndpoint,
        })
        new cdk.CfnOutput(this, 'CfnOutputApsPrometheusEndpoint', {
            key: 'ApsPrometheusEndpoint',
            description: 'APS Prometheus endpoint (ends with /api/v1/)',
            value: apsPrometheusEndpoint.toString(),
            exportName: resolveExportName(this.envConfig, this.stackDomain, 'aps-workspace-endpoint')
        })
    }
}
