import {PlatformServiceName, servicePipelineDomains} from 'lib/config/service/platform-service-registry'
import {foundationPipelineDomains, PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'

export const StackDomain = {
    //runtime envs
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    observability: 'observability',
    serviceRuntime: 'service-runtime',
    serviceEcrRepos: 'service-ecr-repos',
    foundationEcrRepos: 'foundation-ecr-repos',
    api: 'api',
    cognito: 'cognito',

    //platform's service stacks
    ...PlatformServiceName,

    ...PlatformFoundationName,

    //tools env
    cicdInfra: 'cicd-infra',

    // auto-generated pipeline stacks i.e edge-service-pipeline
    ...servicePipelineDomains,

    ...foundationPipelineDomains
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]