import {StackDomain} from 'lib/config/domain'

export const PlatformFoundationName = {
    k6Runner: 'k6-runner',
    baseImages: 'base-images',
    adotCollector: 'adot-collector'

} as const

export type PlatformFoundationName = typeof PlatformFoundationName[keyof typeof PlatformFoundationName]
type PlatformFoundationKey = keyof typeof PlatformFoundationName

//if the foundation uses custom stack creation
export const platformFoundationOverridesSet: ReadonlySet<PlatformFoundationName> = new Set(
    [
        PlatformFoundationName.k6Runner,
    ]
)

//i.e edge-service stack id is 'EdgeService'
const kebabToPascal = (value: string): string =>
    value
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')

const STACK_ID_MAP: Record<PlatformFoundationName, string> =
    Object.values(PlatformFoundationName).reduce((acc, foundationName) => {
        acc[foundationName] = kebabToPascal(foundationName)
        return acc
    }, {} as Record<PlatformFoundationName, string>)

export const getPlatformFoundationStackId = (foundationName: PlatformFoundationName) => {
    return STACK_ID_MAP[foundationName]
}

//pipeline related
type FoundationPipelineDomains = {
    [K in PlatformFoundationKey as `${K}Pipeline`]:
    `${typeof PlatformFoundationName[K]}-pipeline`
}

export const foundationPipelineDomains = Object.fromEntries(
    (Object.keys(PlatformFoundationName) as PlatformFoundationKey[]).map(k => [
        `${k}Pipeline`,
        `${PlatformFoundationName[k]}-pipeline`
    ])
) as FoundationPipelineDomains

const foundationKeyByValue = Object.fromEntries(
    Object.entries(PlatformFoundationName).map(([k, v]) => [v, k])
) as Record<PlatformFoundationName, PlatformFoundationKey>

export const getFoundationPipelineStackDomainFromValue = (foundationName: PlatformFoundationName) =>
    StackDomain[`${foundationKeyByValue[foundationName]}Pipeline` as keyof FoundationPipelineDomains]