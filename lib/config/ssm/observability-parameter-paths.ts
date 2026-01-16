import { ParameterPaths } from './parameter-paths'

export class ObservabilityParameterPaths {
    private constructor() {}

    static adotConfigPath(env: string, serviceName: string): string {
        return `${ParameterPaths.servicePrefix(env, serviceName)}/observability/adot/config.yaml`
    }
}
