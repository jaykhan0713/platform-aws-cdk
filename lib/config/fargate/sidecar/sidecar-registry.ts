export const SideCarName = {
    adot: 'adot'
} as const

export type SideCarName = typeof SideCarName[keyof typeof SideCarName]