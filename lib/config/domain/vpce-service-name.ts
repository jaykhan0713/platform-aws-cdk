export const VpceServiceName = {
    ecrApi: 'ecr-api',
    ecrDkr: 'ecr-dkr',
    logs: 'logs',
    apsWorkspaces: 'aps-workspaces',
    xray: 'xray',
    ssm: 'ssm',
    ssmMessages: 'ssm-messages',
    ec2Messages: 'ec2-messages',
    s3Gateway: 's3-gateway'
} as const

export type VpceServiceName = typeof VpceServiceName[keyof typeof VpceServiceName]