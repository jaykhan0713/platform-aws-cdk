import { StackProps } from 'aws-cdk-lib'

export type EnvName =
    | 'prod'
//  | 'test'

export type EnvConfig = {
    envName: EnvName
    account: string
    region: string

    projectName: string

    tags: {
        managedBy: string
    }
}

const ENV: Record<EnvName, Omit<EnvConfig, 'envName'>> = {
    prod: {
        account: process.env.CDK_DEFAULT_ACCOUNT ?? '454842419646',
        region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
        projectName: 'jay-platform',
        tags: { managedBy: 'cdk' }
    }

    // add envs as necessary
}

export function getEnvConfig(envName: EnvName): EnvConfig {
    const base = ENV[envName]
    return { envName, ...base }
}

export function toCdkStackProps(cfg: EnvConfig): StackProps {
    return {
        env: {
            account: cfg.account,
            region: cfg.region
        }
    }
}