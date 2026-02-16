import {PlatformServiceName, servicePipelineDomains} from 'lib/config/service/platform-service-registry'

export const StackDomain = {
    //runtime envs
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    observability: 'observability',
    serviceRuntime: 'service-runtime',
    serviceEcrRepos: 'service-ecr-repos',
    gateway: 'gateway',

    //platform's service stacks
    ...PlatformServiceName,

    //tools env
    cicdInfra: 'cicd-infra',

    // auto-generated pipeline stacks i.e edge-service-pipeline
    ...servicePipelineDomains
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]