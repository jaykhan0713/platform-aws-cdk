import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {getPlatformFoundationGithubConfig} from 'lib/config/github/github-config'
import {PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'
import {PlatformFoundationCodebuildImage} from 'lib/constructs/cicd/foundation/platform-foundation-codebuild-image'

export interface PlatformFoundationPipelineStackProps extends BaseStackProps {
    artifactsBucket: s3.IBucket
    githubConnectionArn: string

    ecrRepo: ecr.IRepository

    foundationName: PlatformFoundationName
}

export class PlatformFoundationPipelineStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: PlatformFoundationPipelineStackProps) {
        super(scope, id, props)

        const {envConfig, foundationName, stackDomain} = props
        const {projectName} = envConfig

        const foundationGit = getPlatformFoundationGithubConfig()
        const foundationSrc = new codepipeline.Artifact('MainSrc')
        const buildOutput = new codepipeline.Artifact('BuildOutput')

        const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: `${projectName}-${stackDomain}`,
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