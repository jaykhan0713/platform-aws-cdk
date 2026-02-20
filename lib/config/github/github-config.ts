import {PlatformServiceName} from 'lib/config/service/platform-service-registry'

export type GithubConfig = {
    githubOwner: string
    githubRepo: string
    githubBranch: string
}

const GITHUB_OWNER = 'jaykhan0713'

const SERVICE_GITHUB_CONFIG: Record<PlatformServiceName, GithubConfig> =
    Object.values(PlatformServiceName).reduce((acc, serviceName) => {
        acc[serviceName] = {
            githubOwner: GITHUB_OWNER,
            githubRepo: serviceName,
            githubBranch: 'main'
        }
        return acc
    }, {} as Record<PlatformServiceName, GithubConfig>)

const PLATFORM_CDK_GITHUB_CONFIG: GithubConfig = {
    githubOwner: GITHUB_OWNER,
    githubRepo: 'platform-aws-cdk',
    githubBranch: 'main'
} as const

const PLATFORM_FOUNDATION_GITHUB_CONFIG: GithubConfig = {
    githubOwner: GITHUB_OWNER,
    githubRepo: 'platform-foundation',
    githubBranch: 'main'
} as const

export function getServiceGithubConfig(serviceName: PlatformServiceName): GithubConfig {
    const config = SERVICE_GITHUB_CONFIG[serviceName]

    if (!config) {
        throw new Error(`Missing GitHub config for service: ${serviceName}`)
    }

    return config
}

export function getPlatformCdkGithubConfig(): GithubConfig {
    return PLATFORM_CDK_GITHUB_CONFIG
}

export function getPlatformImagesGithubConfig(): GithubConfig {
    return PLATFORM_FOUNDATION_GITHUB_CONFIG
}