import * as cdk from 'aws-cdk-lib'

import * as aps from 'aws-cdk-lib/aws-aps'
import * as ecr from 'aws-cdk-lib/aws-ecr'

import {TagKeys, resolveExportName} from 'lib/config/naming';
import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import {ObservabilityExports} from 'lib/config/dependency/observability/observability-exports'


export class ObservabilityStack extends BaseStack {

    public readonly apsRemoteWriteEndpoint: string
    public readonly apsWorkspaceArn: string

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)
        const envConfig = props.envConfig

        this.templateOptions.description =
            `${envConfig.projectName} observability: SSM + APS (prometheus) workspace + shared outputs`

        // Resources
        const aliasName = `${envConfig.projectName}-aps-${envConfig.envName}`

        const apsWorkspace = new aps.CfnWorkspace(this, 'ApsWorkspace', {
            alias: `${aliasName}`
        })
        cdk.Tags.of(apsWorkspace).add(
            TagKeys.Name,
            `${aliasName}`
        )

        //Outputs with exports
        this.apsRemoteWriteEndpoint = cdk.Fn.sub('${URL}api/v1/remote_write', {
            URL: apsWorkspace.attrPrometheusEndpoint,
        })
        new cdk.CfnOutput(this, 'CfnOutputApsRemoteWriteEndpoint', {
            key: 'ApsRemoteWriteEndpoint',
            description: 'ADOT remote_write endpoint for metrics ingestion',
            value: this.apsRemoteWriteEndpoint,
            exportName: resolveExportName(envConfig, props.stackDomain, ObservabilityExports.apsRemoteWriteEndpoint)
        })

        this.apsWorkspaceArn = apsWorkspace.attrArn
        new cdk.CfnOutput(this, 'CfnOutputApsWorkspaceArn', {
            key: 'ApsWorkspaceArn',
            description: 'APS workspace ARN (useful for IAM policies)',
            value: this.apsWorkspaceArn,
            exportName: resolveExportName(envConfig, props.stackDomain, ObservabilityExports.apsWorkspaceArn)
        })

        //outputs without exports
        const apsQueryEndpoint = cdk.Fn.sub(
            'https://aps-workspaces.${AWS::Region}.amazonaws.com/workspaces/${WsId}',
            { WsId: apsWorkspace.attrWorkspaceId }
        )
        new cdk.CfnOutput(this, 'CfnOutputApsQueryEndpoint', {
            key: 'ApsQueryEndpoint',
            description: 'Grafana Prometheus datasource base URL (SigV4)',
            value: apsQueryEndpoint.toString()
        })

        const apsWorkspaceId = apsWorkspace.attrWorkspaceId
        new cdk.CfnOutput(this, 'CfnOutputApsWorkspaceId', {
            key: 'ApsWorkspaceId',
            description: 'Workspace ID (ws-...) for URL paths',
            value: apsWorkspaceId.toString()
        })

        const apsPrometheusEndpoint = cdk.Fn.sub('${URL}api/v1/', {
            URL: apsWorkspace.attrPrometheusEndpoint,
        })
        new cdk.CfnOutput(this, 'CfnOutputApsPrometheusEndpoint', {
            key: 'ApsPrometheusEndpoint',
            description: 'APS Prometheus endpoint (ends with /api/v1/)',
            value: apsPrometheusEndpoint.toString()
        })
    }
}
