export class ParameterPaths {
    private constructor() {}

    private static readonly PLATFORM_ROOT = '/jay-platform'
    private static readonly OBSERVABILITY = 'observability'

    private static rootPrefix(env: string): string {
        return `${this.PLATFORM_ROOT}/${env}`
    }

    // global

    private static globalPrefix(env: string): string {
        return `${this.rootPrefix(env)}/global`
    }

    static globalObservabilityPrefix(env: string) : string {
        return `${this.globalPrefix(env)}/${this.OBSERVABILITY}`
    }

    // services

    private static servicesPrefix(env: string): string {
        return `${this.rootPrefix(env)}/services`
    }

    static servicePrefix(env: string, serviceName: string): string {
        return `${this.servicesPrefix(env)}/${serviceName}`
    }

    static serviceObservabilityPrefix(env: string, serviceName: string) : string {
        return `${this.servicePrefix(env, serviceName)}/${this.OBSERVABILITY}`
    }
}