import * as cdk from 'aws-cdk-lib'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as s3 from 'aws-cdk-lib/aws-s3'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { PlatformService } from 'lib/config/domain/platform-service'
import { PlatformCodeBuildDocker } from 'lib/constructs/cicd/platform-codebuild-docker'
import {getPlatformCdkGithubConfig, getServiceGithubConfig} from 'lib/config/github/github-config'
import {PlatformCodeBuildCdkDeploy} from 'lib/constructs/cicd/platform-codebuild-cdk-deploy'

export interface PlatformServicePipelineStackProps extends BaseStackProps {
    serviceName: PlatformService
    serviceStackName: string

    artifactsBucket: s3.IBucket
    githubConnectionArn: string

    ecrRepo: ecr.IRepository

    buildspecPath?: string

    bootstrapEnabled?: boolean
}

export class PlatformServicePipelineStack extends BaseStack {
    public readonly pipeline: codepipeline.Pipeline

    public constructor(scope: cdk.App, id: string, props: PlatformServicePipelineStackProps) {
        super(scope, id, props)

        const envConfig = props.envConfig

        const serviceSrc = new codepipeline.Artifact('ServiceSrc')
        const cdkSrc = new codepipeline.Artifact('CdkSrc')
        const buildOutput = new codepipeline.Artifact('BuildOutput')

        // CodeBuild project created inside pipeline stack
        const dockerBuild = new PlatformCodeBuildDocker(this, 'DockerBuild', {
            ...props,
            artifactsBucket: props.artifactsBucket,
            repo: props.ecrRepo,
            buildspecPath: props.buildspecPath,
            enableReports: false,
            ...(
                props.bootstrapEnabled
                    ? { bootstrapTagName: 'bootstrap' }
                    : {}
            )
        })

        const deployBuild = new PlatformCodeBuildCdkDeploy(this, 'BuildCdkDeploy', {
            ...props
        })

        this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: `${envConfig.projectName}-${props.serviceName}-pipeline`,
            artifactBucket: props.artifactsBucket,
            restartExecutionOnUpdate: true
        })

        const serviceGit = getServiceGithubConfig(props.serviceName)
        const cdkGit = getPlatformCdkGithubConfig()

        this.pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipelineActions.CodeStarConnectionsSourceAction({
                    actionName: 'ServiceGitHub',
                    owner: serviceGit.githubOwner,
                    repo: serviceGit.githubRepo,
                    branch: serviceGit.githubBranch,
                    connectionArn: props.githubConnectionArn,
                    output: serviceSrc,
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

        this.pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'DockerBuildAndPush',
                    project: dockerBuild.project,
                    input: serviceSrc,
                    outputs: [buildOutput]
                })
            ]
        })

        this.pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'CdkDeploy',
                    project: deployBuild.project,
                    input: cdkSrc,
                    extraInputs: [buildOutput]
                })
            ]
        })
    }
}
