import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {getPlatformCdkGithubConfig, getPlatformFoundationGithubConfig} from 'lib/config/github/github-config'
import {PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import {PlatformFoundationCodebuildImage} from 'lib/constructs/cicd/foundation/platform-foundation-codebuild-image'

export interface K6RunnerPipelineStackProps extends BaseStackProps {
    artifactsBucket: s3.IBucket
    githubConnectionArn: string

    ecrRepo: ecr.IRepository
}

export class K6RunnerPipelineStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: K6RunnerPipelineStackProps) {
        super(scope, id, props)

        const foundationName = PlatformFoundationName.k6Runner

        const {envConfig} = props
        const {projectName} = envConfig

        const foundationGit = getPlatformFoundationGithubConfig()
        const cdkGit = getPlatformCdkGithubConfig()
        const foundationSrc = new codepipeline.Artifact('MainSrc')
        const cdkSrc = new codepipeline.Artifact('CdkSrc')
        const buildOutput = new codepipeline.Artifact('BuildOutput')

        const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: `${projectName}-${foundationName}-pipeline`,
            artifactBucket: props.artifactsBucket,
            restartExecutionOnUpdate: true
        })

        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipelineActions.CodeStarConnectionsSourceAction({
                    actionName: 'PlatformFoundationGitHub',
                    owner: foundationGit.githubOwner,
                    repo: foundationGit.githubRepo,
                    branch: foundationGit.githubBranch,
                    connectionArn: props.githubConnectionArn,
                    output: foundationSrc,
                    triggerOnPush: false
                }),
                new codepipelineActions.CodeStarConnectionsSourceAction({
                    actionName: 'CdkGitHub',
                    owner: cdkGit.githubOwner,
                    repo: cdkGit.githubRepo,
                    branch: cdkGit.githubBranch,
                    connectionArn: props.githubConnectionArn,
                    output: cdkSrc,
                    triggerOnPush: false
                })
            ]
        })

        const imageBuild = new PlatformFoundationCodebuildImage(this, 'PlatformFoundationCodebuildImage', {
            ...props,
            foundationName,
            buildSpecPath: `${foundationName}/buildspecs/buildspec-image.yml`
        })

        pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'DockerBuildAndPush',
                    project: imageBuild.project,
                    input: foundationSrc,
                    outputs: [buildOutput]
                })
            ]
        })
    }
}