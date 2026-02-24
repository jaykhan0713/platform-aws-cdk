import * as cdk from 'aws-cdk-lib'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import {Construct} from 'constructs'

import {resolveIamRoleName} from 'lib/config/naming'
import {IamConstants} from 'lib/config/domain/iam-constants'
import {BaseStackProps} from 'lib/stacks/base-stack'
import {StackDomain} from 'lib/config/domain'

export interface PlatformCodeBuildCdkDeployProps extends BaseStackProps {
    deployProjectName: string

    stackDomain: StackDomain

    buildSpec: codebuild.BuildSpec

    environmentVariables?: {
        [p: string]: codebuild.BuildEnvironmentVariable
    }

    // CDK bootstrap qualifier (default is stable, not random)
    bootstrapQualifier?: string // default: hnb659fds
}

export class PlatformCodebuildCdkDeploy extends Construct {
    public readonly role: iam.Role
    public readonly project: codebuild.Project
    public readonly logGroup: logs.LogGroup

    public constructor(scope: Construct, id: string, props: PlatformCodeBuildCdkDeployProps) {
        super(scope, id)

        const { envConfig, deployProjectName, stackDomain, buildSpec, environmentVariables } = props
        const account = envConfig.account
        const region = envConfig.region

        const qualifier = props.bootstrapQualifier ?? 'hnb659fds'

        this.role = new iam.Role(this, 'CodebuildCdkDeployRole', {
            roleName: resolveIamRoleName(envConfig, stackDomain, IamConstants.roleArea.codebuildDeploy),
            assumedBy: new iam.ServicePrincipal(IamConstants.principal.codeBuild)
        })

        // Logs
        this.logGroup = new logs.LogGroup(this, 'CodebuildCdkDeployLogGroup', {
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
        this.project = new codebuild.PipelineProject(this, 'CodebuildCdkDeployPipelineProject', {
            projectName: deployProjectName,
            role: this.role,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0
            },
            logging: {
                cloudWatch: { logGroup: this.logGroup }
            },
            environmentVariables,
            buildSpec
        })
    }
}
