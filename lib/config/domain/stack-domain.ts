export const StackDomain = {
    //runtime envs
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    observability: 'observability',
    ecsCluster: 'ecs-cluster',
    ecsServicesCommon: 'ecs-services-common',
    walletService: 'wallet-service',

    //tools env
    cicdInfra: 'cicd-infra'
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]