import {
    PlatformServiceName,
    serviceDtoPipelineDomains,
    servicePipelineDomains
} from 'lib/config/service/platform-service-registry'
import {foundationPipelineDomains, PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'

export const StackDomain = {
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    nat: 'nat',
    observability: 'observability',
    serviceRuntime: 'service-runtime',
    serviceEcrRepos: 'service-ecr-repos',
    foundationEcrRepos: 'foundation-ecr-repos',
    api: 'api',
    cognito: 'cognito',

    //platform's service stacks
    ...PlatformServiceName,

    ...PlatformFoundationName,

    //service owned resources
    apolloServiceRds: 'apollo-service-rds',

    //tools env
    cicdInfra: 'cicd-infra',

    // auto-generated pipeline stacks i.e edge-service-pipeline
    ...servicePipelineDomains,

    ...serviceDtoPipelineDomains,

    ...foundationPipelineDomains
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]

