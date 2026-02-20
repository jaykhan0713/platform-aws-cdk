import * as cdk from 'aws-cdk-lib'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

import { resolveIamRoleName } from 'lib/config/naming'
import { IamConstants } from 'lib/config/domain/iam-constants'
import {BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {PlatformCodeArtifact} from 'lib/constructs/cicd/platform-codeartifact'

export interface PlatformServiceCodeBuildImageProps extends BaseStackProps {

    serviceName: PlatformServiceName

    repo: ecr.IRepository //service repo
    platformCodeArtifact: PlatformCodeArtifact

    buildSpecPath ?: string

    // optional knobs
    enableReports?: boolean
}

export class PlatformServiceCodebuildImage extends Construct {
    public readonly role: iam.Role
    public readonly project: codebuild.Project
    public readonly logGroup: logs.LogGroup

    public constructor(scope: Construct, id: string, props: PlatformServiceCodeBuildImageProps) {
        super(scope, id)

        const { platformCodeArtifact } = props
        const envConfig = props.envConfig
        const { account, region } = envConfig

        this.role = new iam.Role(this, 'CodeBuildImageRole', {
            roleName: resolveIamRoleName(envConfig, props.serviceName, IamConstants.roleArea.codebuildImage),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.codeBuild)
        })

        // ECR permissions for docker push
        props.repo.grantPullPush(this.role)

        //TODO: temp for base images, change when this moves to
        const baseImagesRepo = ecr.Repository.fromRepositoryName(
            this,
            'BaseImagesRepo',
            `${envConfig.projectName}/base-images`
        )
        baseImagesRepo.grantPull(this.role)

        // Some CDK grant helpers include this, but this is the one ECR action that is always registry wide
        this.role.addToPolicy(
            new iam.PolicyStatement({
                sid: 'EcrAuthToken',
                actions: ['ecr:GetAuthorizationToken'],
                resources: ['*']
            })
        )

        //publish and read from codeartifact
        props.platformCodeArtifact.grantReadTo(this.role, envConfig)

        const codeBuildProjectName = `${envConfig.projectName}-${props.serviceName}-codebuild-image`

        // Logs: create a dedicated log group so permissions are clean and predictable
        this.logGroup = new logs.LogGroup(this, 'BuildLogGroup', {
            logGroupName: `/codebuild/${codeBuildProjectName}`,
            retention: logs.RetentionDays.THREE_DAYS,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })
        this.logGroup.grantWrite(this.role)

        const ecrRegistry = `${account}.dkr.ecr.${region}.amazonaws.com`

        this.project = new codebuild.PipelineProject(this, 'CodeBuildImagePipelineProject', {
            projectName: codeBuildProjectName,
            role: this.role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: true
            },
            logging: {
                cloudWatch: {
                    logGroup: this.logGroup
                }
            },
            environmentVariables: {
                ECR_REGISTRY: {value: ecrRegistry},
                ECR_REPO_URI: { value: props.repo.repositoryUri },
                BASE_IMAGES_REPO_URI: { value: baseImagesRepo.repositoryUri },
                CODEARTIFACT_DOMAIN_OWNER: { value: account },
                CODEARTIFACT_DOMAIN: { value: platformCodeArtifact.domain.domainName },
                CODEARTIFACT_REPO: { value: platformCodeArtifact.repo.repositoryName }
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename(props.buildSpecPath ?? 'buildspec.yml'),
        })

        // Optional: CodeBuild report groups when needed
        if (props.enableReports) {
            this.role.addToPolicy(
                new iam.PolicyStatement({
                    sid: 'CodeBuildReports',
                    actions: [
                        'codebuild:CreateReportGroup',
                        'codebuild:CreateReport',
                        'codebuild:UpdateReport',
                        'codebuild:BatchPutTestCases',
                        'codebuild:BatchPutCodeCoverages'
                    ],
                    resources: [
                        `arn:aws:codebuild:${region}:${account}:report-group/${codeBuildProjectName}-*`
                    ]
                })
            )
        }
    }
}
