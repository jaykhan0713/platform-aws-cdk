export const StackDomain = {
    network: 'network',
    vpcEndpoints: 'vpc-endpoints',
    observability: 'observability',
    internalServices: 'internal-services',
    cicdInfra: 'cicd-infra',
    walletService: 'wallet-service'
} as const

export type StackDomain = typeof StackDomain[keyof typeof StackDomain]