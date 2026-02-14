import * as cdk from 'aws-cdk-lib'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as s3 from 'aws-cdk-lib/aws-s3'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { PlatformCodebuildImage } from 'lib/constructs/cicd/platform-codebuild-image'
import {getPlatformCdkGithubConfig, getServiceGithubConfig} from 'lib/config/github/github-config'
import {PlatformCodeBuildCdkDeploy} from 'lib/constructs/cicd/platform-codebuild-cdk-deploy'
import {PlatformCodeArtifact} from 'lib/constructs/cicd/platform-code-artifact'
import {PlatformCodebuildPublish} from "lib/constructs/cicd/platform-codebuild-publish";

export interface PlatformServicePipelineStackProps extends BaseStackProps {
    serviceName: PlatformServiceName
    serviceStackName: string

    artifactsBucket: s3.IBucket
    githubConnectionArn: string
    platformCodeArtifact: PlatformCodeArtifact

    ecrRepo: ecr.IRepository
}

export class PlatformServicePipelineStack extends BaseStack {
    public readonly pipeline: codepipeline.Pipeline

    public constructor(scope: cdk.App, id: string, props: PlatformServicePipelineStackProps) {
        super(scope, id, props)

        const envConfig = props.envConfig

        const serviceSrc = new codepipeline.Artifact('ServiceSrc')
        const cdkSrc = new codepipeline.Artifact('CdkSrc')
        const buildOutput = new codepipeline.Artifact('BuildOutput')

        //TODO if buildspec ever needs to read or write to s3, have to grant perms

        const publishBuild = new PlatformCodebuildPublish(this, 'PlatformCodebuildPublish', {
            ...props,
            repo: props.ecrRepo,
            buildSpecPath: "buildspecs/buildspec-publish.yml",
            enableReports: false
        })

        // CodeBuild project created inside pipeline stack
        const imageBuild = new PlatformCodebuildImage(this, 'PlatformCodebuildImage', {
            ...props,
            repo: props.ecrRepo,
            buildSpecPath: "buildspecs/buildspec-image.yml",
            enableReports: false
        })

        const deployBuild = new PlatformCodeBuildCdkDeploy(this, 'PlatformCodeBuildCdkDeploy', {
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
            stageName: 'Publish',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'DockerPublish',
                    project: publishBuild.project,
                    input: serviceSrc
                })
            ]
        })

        this.pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'DockerBuildAndPush',
                    project: imageBuild.project,
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
