import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as codeartifact from 'aws-cdk-lib/aws-codeartifact'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {Construct} from 'constructs'
import {EnvConfig} from 'lib/config/env/env-config'

export class PlatformCodeArtifact extends Construct {

    public readonly domain: codeartifact.CfnDomain
    public readonly repo: codeartifact.CfnRepository

    public constructor(
        scope: Construct,
        id: string,
        props: BaseStackProps
    ) {
        super(scope, id)

        const { projectName } = props.envConfig

        this.domain = new codeartifact.CfnDomain(this, 'CodeArtifactDomain', {
            domainName: projectName
        })

        this.repo = new codeartifact.CfnRepository(this, 'CodeArtifactRepo', {
            domainName: this.domain.domainName,
            repositoryName: 'maven-internal'
        })

        //TODO optional: can add packagegroup to refine protection

    }

    public grantReadWriteTo(
        principal: iam.IGrantable,
        envConfig: EnvConfig
    ) {
        const statements = this.readWritePolicyStatements(envConfig)
        for (const s of statements) {
            principal.grantPrincipal.addToPrincipalPolicy(s)
        }
    }

    public readWritePolicyStatements(envConfig: EnvConfig): iam.PolicyStatement[] {
        const { account, region } = envConfig
        const domainName = this.domain.domainName
        const repoName = this.repo.repositoryName

        const domainArn = `arn:aws:codeartifact:${region}:${account}:domain/${domainName}`
        const repoArn = `arn:aws:codeartifact:${region}:${account}:repository/${domainName}/${repoName}`

        return [
            new iam.PolicyStatement({ //need bearer token to prove this is an IAM principal
                sid: 'CodeArtifactServiceBearerToken',
                actions: ['sts:GetServiceBearerToken'],
                resources: ['*'],
                conditions: {
                    StringEquals: {
                        'sts:AWSServiceName': 'codeartifact.amazonaws.com'
                    }
                }
            }),
            new iam.PolicyStatement({ // get temp auth token to access code artifact
                sid: 'CodeArtifactAuthToken',
                actions: [
                    'codeartifact:GetAuthorizationToken',
                    'codeartifact:DescribeDomain'
                ],
                resources: [domainArn]
            }),
            new iam.PolicyStatement({
                sid: 'CodeArtifactRepoReadWrite',
                actions: [
                    'codeartifact:GetRepositoryEndpoint',
                    'codeartifact:ReadFromRepository',
                    'codeartifact:PublishPackageVersion',
                    'codeartifact:PutPackageMetadata',
                    'codeartifact:UpdatePackageVersionsStatus',
                    'codeartifact:DescribeRepository',
                    'codeartifact:ListPackages',
                    'codeartifact:ListPackageVersions',
                    'codeartifact:DescribePackageVersion',
                    'codeartifact:GetPackageVersionReadme',
                    'codeartifact:GetPackageVersionAsset',
                    'codeartifact:ListPackageVersionAssets'
                ],
                resources: [repoArn]
            })
        ]
    }
}