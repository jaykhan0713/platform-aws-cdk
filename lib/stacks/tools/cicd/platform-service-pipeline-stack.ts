import * as cdk from 'aws-cdk-lib'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as s3 from 'aws-cdk-lib/aws-s3'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { PlatformServiceName } from 'lib/config/domain/platform-service-name'
import { PlatformCodeBuildDocker } from 'lib/constructs/cicd/platform-codebuild-docker'

export interface PlatformServicePipelineStackProps extends BaseStackProps {
    serviceName: PlatformServiceName

    artifactsBucket: s3.IBucket
    githubConnectionArn: string

    // service repo location
    githubOwner: string
    githubRepo: string
    githubBranch: string

    ecrRepo: ecr.IRepository

    buildspecPath?: string
}

export class PlatformServicePipelineStack extends BaseStack {
    public readonly pipeline: codepipeline.Pipeline

    public constructor(scope: cdk.App, id: string, props: PlatformServicePipelineStackProps) {
        super(scope, id, props)

        const envConfig = props.envConfig

        const sourceOutput = new codepipeline.Artifact('SourceOutput')
        const buildOutput = new codepipeline.Artifact('BuildOutput')

        // CodeBuild project created inside pipeline stack
        const dockerBuild = new PlatformCodeBuildDocker(this, 'DockerBuild', {
            ...props,
            artifactsBucket: props.artifactsBucket,
            repo: props.ecrRepo,
            buildspecPath: props.buildspecPath,
            enableReports: false
        })

        this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: `${envConfig.projectName}-${props.serviceName}-pipeline`,
            artifactBucket: props.artifactsBucket,
            restartExecutionOnUpdate: true
        })

        this.pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipelineActions.CodeStarConnectionsSourceAction({
                    actionName: 'GitHub',
                    owner: props.githubOwner,
                    repo: props.githubRepo,
                    branch: props.githubBranch,
                    connectionArn: props.githubConnectionArn,
                    output: sourceOutput,
                    triggerOnPush: false
                })
            ]
        })

        this.pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'DockerBuildAndPush',
                    project: dockerBuild.project,
                    input: sourceOutput,
                    outputs: [buildOutput]
                })
            ]
        })

        // Placeholder deploy stage so you can confirm Source -> Build works end to end
        this.pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipelineActions.ManualApprovalAction({
                    actionName: 'Hold'
                })
            ]
        })
    }
}
