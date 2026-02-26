import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import {PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'
import { TagKeys } from 'lib/config/naming'

export class PlatformFoundationEcrReposStack extends BaseStack {

    public readonly ecrRepos: Record<PlatformFoundationName, ecr.IRepository>

    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)

        const { envConfig } = props
        const { projectName } = envConfig

        const repos: Partial<Record<PlatformFoundationName, ecr.IRepository>> = {}

        for (const foundationName of Object.values(PlatformFoundationName)) {
            const repoName = `${projectName}/${foundationName}`
            const repo = new ecr.Repository(this, `${foundationName}EcrRepo`, {
                repositoryName: repoName,
                imageTagMutability: ecr.TagMutability.MUTABLE,
                imageScanOnPush: true,
                encryption: ecr.RepositoryEncryption.AES_256,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                emptyOnDelete: true
            })

            repo.addLifecycleRule({
                description: `Expire untagged images older than 1 days`,
                tagStatus: ecr.TagStatus.UNTAGGED,
                maxImageAge: cdk.Duration.days(1),
                rulePriority: 1
            })

            cdk.Tags.of(repo).add(TagKeys.Name, repoName)

            repos[foundationName] = repo
        }

        this.ecrRepos = repos as Record<PlatformFoundationName, ecr.IRepository>
    }
}
