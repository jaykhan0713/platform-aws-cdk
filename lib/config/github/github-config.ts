import {PlatformServiceName} from 'lib/config/domain/platform-service-name'

export type GithubConfig = {
    githubOwner: string
    githubRepo: string
    githubBranch: string
}

const GITHUB_CONFIG: Record<PlatformServiceName, GithubConfig> = {
    'edge-service': {
        githubOwner: 'jaykhan0713',
        githubRepo: 'edge-service',
        githubBranch: 'main'
    }
}

export function getGithubConfig(serviceName: PlatformServiceName): GithubConfig {
    const config = GITHUB_CONFIG[serviceName]

    if (!config) {
        throw new Error(`Missing GitHub config for service: ${serviceName}`)
    }

    return config
}