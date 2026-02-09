import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'
import {resolvePlatformServiceRepoName} from 'lib/config/naming/ecr-repo'
import {PlatformServiceName} from 'lib/config/service/platform-service'
import {TagKeys} from 'lib/config/naming'
import {PlatformServiceEcrRepo} from 'lib/constructs/ecr/platform-service-ecr-repo'

export class PlatformServiceEcrReposStack extends BaseStack {
    public readonly repos: Record<PlatformServiceName, ecr.IRepository>

    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)


        const repos: Partial<Record<PlatformServiceName, ecr.IRepository>> = {}

        for (const serviceName of Object.values(PlatformServiceName)) {
            const repo = new PlatformServiceEcrRepo(this, `${serviceName}PlatformServiceEcrRepo`, {
                ...props,
                serviceName
            }).serviceRepo

            cdk.Tags.of(repo).add(
                TagKeys.Name,
                resolvePlatformServiceRepoName(props.envConfig, serviceName)
            )

            repos[serviceName] = repo
        }

        this.repos = repos as Record<PlatformServiceName, ecr.IRepository>
    }
}
