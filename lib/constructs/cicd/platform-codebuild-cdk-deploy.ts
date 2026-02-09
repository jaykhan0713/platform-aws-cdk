import * as cdk from 'aws-cdk-lib'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import {Construct} from 'constructs'

import {resolveIamRoleName} from 'lib/config/naming/index'
import {IamConstants} from 'lib/config/domain/iam-constants'
import {BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformServiceName} from 'lib/config/service/platform-service'

export interface PlatformCodeBuildCdkDeployProjectProps extends BaseStackProps {
    serviceName: PlatformServiceName

    artifactsBucket: s3.IBucket

    // CodePipeline artifact names (these become CODEBUILD_SRC_DIR_<name>)
    cdkSourceArtifactName?: string // default: CdkSrc
    buildOutputArtifactName?: string //default: BuildOuput

    // What to deploy
    serviceStackName: string

    // CDK bootstrap qualifier (default is stable, not random)
    bootstrapQualifier?: string // default: hnb659fds
}

export class PlatformCodeBuildCdkDeploy extends Construct {
    public readonly role: iam.Role
    public readonly project: codebuild.Project
    public readonly logGroup: logs.LogGroup

    public constructor(scope: Construct, id: string, props: PlatformCodeBuildCdkDeployProjectProps) {
        super(scope, id)

        const envConfig = props.envConfig
        const account = envConfig.account
        const region = envConfig.region

        const qualifier = props.bootstrapQualifier ?? 'hnb659fds'
        const cdkSrcName = props.cdkSourceArtifactName ?? 'CdkSrc'
        const buildOutputName = props.buildOutputArtifactName ?? 'BuildOutput'

        const deployProjectName = `${envConfig.projectName}-${props.serviceName}-deploy`

        this.role = new iam.Role(this, 'CodeBuildDeployServiceRole', {
            roleName: resolveIamRoleName(envConfig, props.serviceName, IamConstants.roleArea.codebuildDeploy),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.codeBuild)
        })

        // Let the deploy step read pipeline artifacts (cdk repo + imagetag.txt)
        props.artifactsBucket.grantRead(this.role)

        // Logs
        this.logGroup = new logs.LogGroup(this, 'DeployLogGroup', {
            logGroupName: `/codebuild/${deployProjectName}`,
            retention: logs.RetentionDays.THREE_DAYS,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })
        this.logGroup.grantWrite(this.role)

        // Allow CodeBuild (caller) to assume the CDK bootstrap roles
        const bootstrapRoleArns = [
            `arn:aws:iam::${account}:role/cdk-${qualifier}-deploy-role-${account}-${region}`,
            `arn:aws:iam::${account}:role/cdk-${qualifier}-file-publishing-role-${account}-${region}`,
            `arn:aws:iam::${account}:role/cdk-${qualifier}-lookup-role-${account}-${region}`
        ]

        this.role.addToPolicy(new iam.PolicyStatement({
            sid: 'AssumeCdkBootstrapRoles',
            effect: iam.Effect.ALLOW,
            actions: ['sts:AssumeRole', 'sts:TagSession'],
            resources: bootstrapRoleArns
        }))

        // CDK deploy project
        this.project = new codebuild.PipelineProject(this, 'CodeBuildCdkDeployPipelineProject', {
            projectName: deployProjectName,
            role: this.role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0
            },
            logging: {
                cloudWatch: { logGroup: this.logGroup }
            },
            environmentVariables: {
                AWS_DEFAULT_REGION: {value: region},
                CDK_SOURCE_ARTIFACT_NAME: {value: cdkSrcName},
                SERVICE_STACK_NAME: {value: props.serviceStackName}
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
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
                            `echo "imagetag.txt contents:"`,
                            `cat "$CODEBUILD_SRC_DIR_${buildOutputName}/imagetag.txt" || true`,

                            `export IMAGE_TAG="$(cat "$CODEBUILD_SRC_DIR_${buildOutputName}/imagetag.txt")"`,
                            `echo "IMAGE_TAG=[$IMAGE_TAG]"`,

                            // fail early if empty
                            `test -n "$IMAGE_TAG"`,

                            'npm run cdk:services -- deploy $SERVICE_STACK_NAME --require-approval never ' +
                            `-c deploy=${props.serviceName} ` +
                            `-c imageTag=$IMAGE_TAG`
                        ]
                    }
                }
            })
        })
    }
}
