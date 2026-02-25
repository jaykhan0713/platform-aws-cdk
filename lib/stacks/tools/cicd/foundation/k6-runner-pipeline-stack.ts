import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {getPlatformCdkGithubConfig, getPlatformFoundationGithubConfig} from 'lib/config/github/github-config'
import {getPlatformFoundationStackId, PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions'
import {PlatformFoundationCodebuildImage} from 'lib/constructs/cicd/foundation/platform-foundation-codebuild-image'
import {StackDomain} from 'lib/config/domain'
import {Construct} from 'constructs'
import {PlatformCodebuildCdkDeploy} from 'lib/constructs/cicd/platform-codebuild-cdk-deploy'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import {getPlatformServiceStackId} from 'lib/config/service/platform-service-registry'

export interface K6RunnerPipelineStackProps extends BaseStackProps {
    artifactsBucket: s3.IBucket
    githubConnectionArn: string

    ecrRepo: ecr.IRepository

    foundationName: PlatformFoundationName
}

export class K6RunnerPipelineStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: K6RunnerPipelineStackProps) {
        super(scope, id, props)

        const {envConfig, foundationName, stackDomain} = props
        const {projectName} = envConfig

        const foundationGit = getPlatformFoundationGithubConfig()
        const cdkGit = getPlatformCdkGithubConfig()
        const foundationSrc = new codepipeline.Artifact('MainSrc')
        const cdkSrc = new codepipeline.Artifact('CdkSrc')
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

        const deployProject =
            this.codebuildCdkDeployProject(this, props, cdkSrc.artifactName!, buildOutput.artifactName!).project

        pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'CdkDeployLoadTestStack',
                    project: deployProject,
                    input: cdkSrc,
                    extraInputs: [buildOutput]
                })
            ]
        })
    }

    private codebuildCdkDeployProject(
        scope: Construct,
        props: K6RunnerPipelineStackProps,
        cdkSrcName: string,
        buildOutputName: string
    ) {

        const {envConfig, foundationName} = props
        const {projectName} = envConfig

        const deployProjectName = `${projectName}-${foundationName}-codebuild-deploy`

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

                        `export IMAGE_DIGEST_URI="$(cat "$CODEBUILD_SRC_DIR_${buildOutputName}/imagedigesturi.txt")"`,
                        'echo "IMAGE_DIGEST_URI=[$IMAGE_DIGEST_URI]"',

                        // fail early if empty
                        '[ -n "$IMAGE_DIGEST_URI" ] || { echo "IMAGE_DIGEST_URI is empty"; exit 1; }',

                        [
                            `npm run cdk:load-test -- deploy ${getPlatformFoundationStackId(foundationName)}`,
                            '--require-approval never',
                            '-c imageDigestUri=$IMAGE_DIGEST_URI'
                        ].join(' ')
                    ]
                }
            }
        })

        return new PlatformCodebuildCdkDeploy(scope, 'PlatformCodebuildCdkDeploy', {
            ...props,
            deployDomain: foundationName,
            deployProjectName,
            buildSpec
        })
    }

}