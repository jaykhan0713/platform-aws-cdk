import {PlatformServices} from 'lib/config/domain/platform-services'

export const StackDomain = {
    //runtime envs
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    observability: 'observability',
    ecsCluster: 'ecs-cluster',
    ecsServicesCommon: 'ecs-services-common',
    ecrRepo: 'ecr-repo',

    //platform's service stacks
    edge: PlatformServices.edge,
    wallet: PlatformServices.wallet,

    //tools env
    cicdInfra: 'cicd-infra'
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]