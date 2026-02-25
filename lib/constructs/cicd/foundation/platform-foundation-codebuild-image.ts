import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'

import {BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'
import {resolveIamRoleName} from 'lib/config/naming'
import {IamConstants} from 'lib/config/domain'
import * as cdk from 'aws-cdk-lib'

export interface PlatformFoundationCodeBuildImageProps extends BaseStackProps {

    foundationName: PlatformFoundationName

    ecrRepo: ecr.IRepository //service repo

    buildSpecPath ?: string

    // optional knobs
    enableReports?: boolean
}

export class PlatformFoundationCodebuildImage extends Construct {

    public readonly project: codebuild.Project

    public constructor(scope: Construct, id: string, props: PlatformFoundationCodeBuildImageProps) {
        super(scope, id)

        const { envConfig, ecrRepo, foundationName } = props

        const codebuildProjectName = `${envConfig.projectName}-${foundationName}-codebuild-image`

        const role = new iam.Role(this, 'CodebuildImage', {
            roleName: resolveIamRoleName(envConfig, foundationName, IamConstants.roleArea.codebuildImage),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.codeBuild)
        })

        ecrRepo.grantPullPush(role)

        role.addToPolicy(
            new iam.PolicyStatement({
                sid: 'EcrAuthToken',
                actions: ['ecr:GetAuthorizationToken'],
                resources: ['*']
            })
        )

        const logGroup = new logs.LogGroup(this, 'ImageLogGroup', {
            logGroupName: `/codebuild/${codebuildProjectName}`,
            retention: logs.RetentionDays.ONE_DAY,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })

        logGroup.grantWrite(role)

        const ecrRegistry = `${envConfig.account}.dkr.ecr.${envConfig.region}.amazonaws.com`
        
        this.project = new codebuild.PipelineProject(this, 'CodebuildImagePipelineProject', {
            projectName: codebuildProjectName,
            role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: true
            },
            logging: {
                cloudWatch: {
                    logGroup
                }
            },
            environmentVariables: {
                ECR_REGISTRY: {value: ecrRegistry},
                ECR_REPO_URI: { value: ecrRepo.repositoryUri }
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename(props.buildSpecPath ?? 'buildspec.yml')
        })
    }
}