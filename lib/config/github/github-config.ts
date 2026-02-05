import {PlatformServiceName} from 'lib/config/service/platform-service-name'

export type GithubConfig = {
    githubOwner: string
    githubRepo: string
    githubBranch: string
}

const SERVICE_GITHUB_CONFIG: Record<PlatformServiceName, GithubConfig> = {
    'edge-service': {
        githubOwner: 'jaykhan0713',
        githubRepo: 'edge-service',
        githubBranch: 'main'
    }
}

const PLATFORM_CDK_GITHUB_CONFIG: GithubConfig = {
    githubOwner: 'jaykhan0713',
    githubRepo: 'platform-aws-cdk',
    githubBranch: 'main'
}

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