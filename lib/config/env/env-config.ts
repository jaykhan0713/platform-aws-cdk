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

    // stack-specific options grouped //TODO separate per ownership boundaries

    vpcConfig?: {
        cidrBlock: string
        maxAzs: number
    }

    vpceConfig?: {
        interfaceOptions: {
            enableEndpoints: boolean
            enableEcsExec: boolean

            // single AZ per interface endpoint by default to save cost. For real traffic, can toggle
            enableInterfaceMultiAz: boolean
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

        vpcConfig: {
            cidrBlock: '10.0.0.0/16',
            maxAzs: 2
        },

        vpceConfig: {
            interfaceOptions: {
                enableEndpoints: true,
                enableEcsExec: false,
                enableInterfaceMultiAz: false
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