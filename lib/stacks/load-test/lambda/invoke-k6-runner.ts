import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs'

const ecs = new ECSClient({})

interface InvokeK6RunnerEvent {
    vus?: number
    duration?: string
    sleepIntervalMs?: number
}

export const handler = async (event: InvokeK6RunnerEvent) => {
    const clusterArn = process.env.CLUSTER_ARN
    const taskDefArn = process.env.TASK_DEF_ARN
    const subnetIds = process.env.SUBNET_IDS!.split(',')
    const securityGroupId = process.env.SECURITY_GROUP_ID
    const containerName = process.env.CONTAINER_NAME

    if (!(clusterArn && taskDefArn && subnetIds && securityGroupId && containerName)) {
        throw new Error("Missing required ENV variable(s)")
    }

    if (event.vus && event.vus > 10) {
        throw new Error(`Virtual users cannot exceed 10: ${event.vus}`)
    }

    const duration = event.duration ? validateDuration(event.duration) : '10s'

    const command = new RunTaskCommand({
        cluster: clusterArn,
        taskDefinition: taskDefArn,
        count: 1,
        capacityProviderStrategy: [
            {
                capacityProvider: 'FARGATE_SPOT',
                weight: 1
            }
        ],
        networkConfiguration: {
            awsvpcConfiguration: {
                subnets: subnetIds,
                securityGroups: [securityGroupId],
                assignPublicIp: 'ENABLED'
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: containerName,
                    environment: [
                        {
                            name: 'VIRTUAL_USERS',
                            value: event.vus ? event.vus.toString() : '1'
                        },
                        {
                            name: 'DURATION',
                            value: duration
                        },
                        {
                            name: 'SLEEP_INTERVAL',
                            value: event.sleepIntervalMs ? event.sleepIntervalMs.toString() : '0'
                        }
                    ]
                }
            ]
        }
    })

    const response = await ecs.send(command)

    return {
        statusCode: 200,
        body: JSON.stringify({
            taskArn: response.tasks?.[0]?.taskArn
        })
    }
}

//accounts for "1h30m15s", "10s", "10m", etc
function validateDuration(duration: string) {
    const strict = /^(\d+(ms|s|m|h))+$/
    if (!strict.test(duration)) {
        throw new Error(`Invalid duration format: ${duration}`)
    }

    const regex = /(\d+)(ms|s|m|h)/g
    let totalSeconds = 0
    let match

    while ((match = regex.exec(duration)) !== null) {
        const value = parseInt(match[1], 10)
        const unit = match[2]

        switch (unit) {
            case 'ms':
                totalSeconds += value / 1000
                break
            case 's':
                totalSeconds += value
                break
            case 'm':
                totalSeconds += value * 60
                break
            case 'h':
                totalSeconds += value * 3600
                break
            default:
                throw new Error(`Invalid duration unit: ${unit}`)
        }
    }

    if (totalSeconds === 0) {
        throw new Error(`Invalid duration format: ${duration}`)
    }

    if (totalSeconds > 3600) {
        throw new Error('Duration cannot exceed 1h')
    }

    return duration
}