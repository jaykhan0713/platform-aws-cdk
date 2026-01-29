import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as codestarconnections from 'aws-cdk-lib/aws-codestarconnections'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'

export class CicdInfraStack extends BaseStack {

    public readonly githubConnectionArn: string
    public readonly artifactsBucket: s3.Bucket

    public constructor(
        scope: cdk.App,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id, props)

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
            connectionName: `${props.envConfig.projectName}-github-connection`,
            providerType: 'GitHub'
        })

        this.githubConnectionArn = githubConnection.attrConnectionArn


    }
}