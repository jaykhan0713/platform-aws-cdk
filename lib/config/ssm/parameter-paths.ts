export class ParameterPaths {
    private constructor() {}

    private static readonly PLATFORM_ROOT = '/jay-platform'
    private static readonly GLOBAL = 'global'
    private static readonly SERVICES = 'services'

    static rootPrefix(env: string): string {
        return `${this.PLATFORM_ROOT}/${env}`
    }

    static globalPrefix(env: string): string {
        return `${this.rootPrefix(env)}/${this.GLOBAL}`
    }

    static servicesPrefix(env: string): string {
        return `${this.rootPrefix(env)}/${this.SERVICES}`
    }

    static servicePrefix(env: string, serviceName: string): string {
        return `${this.servicesPrefix(env)}/${serviceName}`
    }
}