import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import {resolvePlatformServiceRepoName} from 'lib/config/naming/ecr-repo'
import {PlatformServices} from 'lib/config/domain/platform-services'
import {TagKeys} from 'lib/config/naming'

export class EcrRepoStack extends BaseStack {
    public readonly edgeServiceRepo: ecr.Repository

    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)

        this.edgeServiceRepo = new ecr.Repository(this,  'EdgeServiceRepository', {
            repositoryName: resolvePlatformServiceRepoName(this.envConfig, PlatformServices.edge),
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.AES_256
        })

        this.edgeServiceRepo.addLifecycleRule({
            description: `Expire untagged images older than 3 days`,
            tagStatus: ecr.TagStatus.UNTAGGED,
            maxImageAge: cdk.Duration.days(3),
            rulePriority: 1
        })

        this.edgeServiceRepo.addLifecycleRule({
            description: `Keep last 5 git-tagged images`,
            tagStatus: ecr.TagStatus.TAGGED,
            tagPrefixList: ['git-'],
            maxImageCount: 5,
            rulePriority: 2
        })

        cdk.Tags.of(this.edgeServiceRepo)
            .add(TagKeys.Name, resolvePlatformServiceRepoName(this.envConfig, PlatformServices.edge))

        //outputs
        new cdk.CfnOutput(this, 'EdgeServiceRepositoryArn', {
            value: this.edgeServiceRepo.repositoryArn
        })
        new cdk.CfnOutput(this, 'EdgeServiceRepositoryUri', {
            value: this.edgeServiceRepo.repositoryUri
        })
        new cdk.CfnOutput(this, 'EdgeServiceRepositoryName', {
            value: this.edgeServiceRepo.repositoryName
        })
    }
}