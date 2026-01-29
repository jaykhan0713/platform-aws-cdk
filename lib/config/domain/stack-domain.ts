import {PlatformServiceName} from 'lib/config/domain/platform-service-name'

export const StackDomain = {
    //runtime envs
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    observability: 'observability',
    ecsCluster: 'ecs-cluster',
    ecsServicesCommon: 'ecs-services-common',
    serviceEcrRepos: 'service-ecr-repos',

    //platform's service stacks
    edgeService: PlatformServiceName.edgeService,

    //tools env
    cicdInfra: 'cicd-infra',

    //tools env pipeline stacks
    edgeServicePipeline: `${PlatformServiceName.edgeService}-pipeline`
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]