import {PlatformService} from 'lib/config/domain/platform-service'

export const StackDomain = {
    //runtime envs
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    observability: 'observability',
    ecsCluster: 'ecs-cluster',
    ecsServicesCommon: 'ecs-services-common',
    serviceEcrRepos: 'service-ecr-repos',

    //platform's service stacks
    edgeService: PlatformService.edgeService,

    //tools env
    cicdInfra: 'cicd-infra',

    //tools env pipeline stacks
    edgeServicePipeline: `${PlatformService.edgeService}-pipeline`
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]