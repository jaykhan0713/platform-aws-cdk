import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import type { BaseStackProps } from 'lib/stacks/base-stack'
import {resolvePlatformServiceRepoName} from 'lib/config/naming/ecr-repo'
import { PlatformServiceName } from 'lib/config/domain/platform-service-name'
import {Construct} from 'constructs'

export interface PlatformServiceEcrProps extends BaseStackProps {
    readonly serviceName: PlatformServiceName
}

export class PlatformServiceEcrRepo extends Construct {
    public readonly serviceRepo: ecr.IRepository

    constructor(scope: Construct, id: string, props: PlatformServiceEcrProps) {
        super(scope, id)

        const ecrRepo = new ecr.Repository(this,  'EcrRepo', {
            repositoryName: resolvePlatformServiceRepoName(props.envConfig, props.serviceName),
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.AES_256
        })

        ecrRepo.addLifecycleRule({
            description: `Expire untagged images older than 3 days`,
            tagStatus: ecr.TagStatus.UNTAGGED,
            maxImageAge: cdk.Duration.days(3),
            rulePriority: 1
        })

        ecrRepo.addLifecycleRule({
            description: `Keep last 5 git-tagged images`,
            tagStatus: ecr.TagStatus.TAGGED,
            tagPrefixList: ['git-'],
            maxImageCount: 5,
            rulePriority: 2
        })

        this.serviceRepo = ecrRepo
    }
}