import * as cdk from 'aws-cdk-lib'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as s3 from 'aws-cdk-lib/aws-s3'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import {getServiceGithubConfig} from 'lib/config/github/github-config'
import {PlatformCodeArtifact} from 'lib/constructs/cicd/platform-codeartifact'
import {PlatformServiceCodebuildPublish} from "lib/constructs/cicd/service/platform-service-codebuild-publish";

export interface PlatformServiceDtoPipelineStackProps extends BaseStackProps {
    serviceName: PlatformServiceName

    artifactsBucket: s3.IBucket
    githubConnectionArn: string
    platformCodeArtifact: PlatformCodeArtifact

    ecrRepo: ecr.IRepository
}

export class PlatformServiceDtoPipelineStack extends BaseStack {
    public readonly pipeline: codepipeline.Pipeline

    public constructor(scope: cdk.App, id: string, props: PlatformServiceDtoPipelineStackProps) {
        super(scope, id, props)

        const envConfig = props.envConfig

        const serviceSrc = new codepipeline.Artifact('ServiceSrc')

        const publishBuild = new PlatformServiceCodebuildPublish(this, 'PlatformServiceCodebuildPublish', {
            ...props,
            repo: props.ecrRepo,
            buildSpecPath: "buildspecs/buildspec-publish.yml",
            enableReports: false
        })

        this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: `${envConfig.projectName}-${props.serviceName}-dto-pipeline`,
            artifactBucket: props.artifactsBucket,
            restartExecutionOnUpdate: true
        })

        const serviceGit = getServiceGithubConfig(props.serviceName)

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
                })
            ]
        })

        this.pipeline.addStage({
            stageName: 'Publish',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'PublishCodeArtifact',
                    project: publishBuild.project,
                    input: serviceSrc
                })
            ]
        })
    }
}
