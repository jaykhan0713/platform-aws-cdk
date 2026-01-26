import type {StackProps} from 'aws-cdk-lib'
import type { EnvName } from 'lib/config/domain'

export type EnvConfig = {
    envName: EnvName
    account: string
    region: string

    projectName: string

    tags: {
        managedBy: string
    }

    // stack-specific options grouped

    vpceConfig?: {
        interfaceOptions: {
            enableEndpoints: boolean
            enableEcsExec: boolean

            // single AZ per interface endpoint by default to save cost. For real traffic, can toggle
            enableMultiAz: boolean
        }
    }

    ecsClusterConfig?: {
        enableContainerInsights: boolean
    }
}

const ENV: Record<EnvName, Omit<EnvConfig, 'envName'>> = {
    prod: {
        account: '454842419646',
        region: 'us-west-2',
        projectName: 'jay-platform',
        tags: { managedBy: 'cdk' },

        vpceConfig: {
            interfaceOptions: {
                enableEndpoints: false,
                enableEcsExec: false,
                enableMultiAz: false
            }
        },

        ecsClusterConfig: {
            enableContainerInsights: false
        }
    },

    tools: {
        account: '454842419646',
        region: 'us-west-2',
        projectName: 'jay-platform',
        tags: { managedBy: 'cdk' }
    }
}

export function getEnvConfig(envName: EnvName): EnvConfig {
    const base = ENV[envName]
    return {
        envName,
        ...base
    }
}

export function toCdkStackProps(cfg: EnvConfig): StackProps {
    return {
        env: {
            account: cfg.account,
            region: cfg.region
        }
    }
}