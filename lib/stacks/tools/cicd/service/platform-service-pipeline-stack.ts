import * as cdk from 'aws-cdk-lib'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as s3 from 'aws-cdk-lib/aws-s3'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import {getPlatformServiceStackId, PlatformServiceName} from 'lib/config/service/platform-service-registry'
import { PlatformServiceCodebuildImage } from 'lib/constructs/cicd/service/platform-service-codebuild-image'
import {getPlatformCdkGithubConfig, getServiceGithubConfig} from 'lib/config/github/github-config'
import {PlatformCodeArtifact} from 'lib/constructs/cicd/platform-codeartifact'
import {Construct} from 'constructs'
import {PlatformCodebuildCdkDeploy} from 'lib/constructs/cicd/platform-codebuild-cdk-deploy'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'

export interface PlatformServicePipelineStackProps extends BaseStackProps {
    serviceName: PlatformServiceName

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

        // CodeBuild project created inside pipeline stack
        const imageBuild = new PlatformServiceCodebuildImage(this, 'PlatformServiceCodebuildImage', {
            ...props,
            repo: props.ecrRepo,
            buildSpecPath: "buildspecs/buildspec-image.yml",
            enableReports: false
        })

        this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: `${envConfig.projectName}-${props.stackDomain}`,
            artifactBucket: props.artifactsBucket,
            restartExecutionOnUpdate: false
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
                    project: imageBuild.project,
                    input: serviceSrc,
                    outputs: [buildOutput]
                })
            ]
        })

        const deployProject =
            this.codebuildCdkDeployProject(this, props, cdkSrc.artifactName!, buildOutput.artifactName!).project

        this.pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'CdkDeploy',
                    project: deployProject,
                    input: cdkSrc,
                    extraInputs: [buildOutput]
                })
            ]
        })
    }

    private codebuildCdkDeployProject(
        scope: Construct,
        props: PlatformServicePipelineStackProps,
        cdkSrcName: string,
        buildOutputName: string
    ) {
        const {envConfig, serviceName} = props
        const {projectName} = envConfig

        const deployProjectName = `${projectName}-${serviceName}-codebuild-deploy`

        const buildSpec = codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
                install: {
                    'runtime-versions': {
                        nodejs: 20
                    },
                    commands: [
                        'node --version',
                        'npm --version',
                        `cd "$CODEBUILD_SRC_DIR_${cdkSrcName}"`,
                        'npm ci'
                    ]
                },
                build: {
                    commands: [
                        `cd "$CODEBUILD_SRC_DIR_${cdkSrcName}"`,

                        `echo "BuildOutput dir: $CODEBUILD_SRC_DIR_${buildOutputName}"`,
                        `ls -la "$CODEBUILD_SRC_DIR_${buildOutputName}" || true`,
                        'echo "imagetag.txt contents:"',
                        `cat "$CODEBUILD_SRC_DIR_${buildOutputName}/imagetag.txt" || true`,

                        `export IMAGE_TAG="$(cat "$CODEBUILD_SRC_DIR_${buildOutputName}/imagetag.txt")"`,
                        'echo "IMAGE_TAG=[$IMAGE_TAG]"',

                        // fail early if empty
                        '[ -n "$IMAGE_TAG" ] || { echo "IMAGE_TAG is empty"; exit 1; }',

                        [
                            `npm run cdk:services -- deploy ${getPlatformServiceStackId(props.serviceName)}`,
                            '--require-approval never',
                            '-c imageTag=$IMAGE_TAG'
                        ].join(' ')
                    ]
                }
            }
        })
        return new PlatformCodebuildCdkDeploy(scope, 'PlatformCodebuildCdkDeploy', {
            ...props,
            deployDomain: serviceName,
            deployProjectName,
            buildSpec
        })
    }
}
