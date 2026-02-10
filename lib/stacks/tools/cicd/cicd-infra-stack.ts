import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as codestarconnections from 'aws-cdk-lib/aws-codestarconnections'
import * as codeartifact from 'aws-cdk-lib/aws-codeartifact'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformCodeArtifact} from 'lib/constructs/cicd/platform-code-artifact'

export class CicdInfraStack extends BaseStack {

    public readonly githubConnectionArn: string
    public readonly artifactsBucket: s3.Bucket
    public readonly platformCodeArtifact: PlatformCodeArtifact

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

        const { projectName } = props.envConfig

        this.artifactsBucket = new s3.Bucket(this,  'PipelineArtifactsBucket', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            versioned: true,
            lifecycleRules: [
                {
                    expiration: cdk.Duration.days(3),
                    noncurrentVersionExpiration: cdk.Duration.days(2)
                }
            ]
        })

        // Deploys as PENDING until you manually authorize it in the AWS console once
        const githubConnection = new codestarconnections.CfnConnection(this, 'GithubConnection', {
            connectionName: `${projectName}-github-connection`,
            providerType: 'GitHub'
        })

        this.githubConnectionArn = githubConnection.attrConnectionArn

        this.platformCodeArtifact = new PlatformCodeArtifact(this, 'PlatformCodeArtifact', props)
    }
}