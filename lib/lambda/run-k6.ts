import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs'

const ecs = new ECSClient({})

export const handler = async () => {
    const clusterArn = process.env.CLUSTER_ARN!
    const taskDefArn = process.env.TASK_DEF_ARN!
    const subnetIds = process.env.SUBNET_IDS!.split(',')
    const securityGroupId = process.env.SECURITY_GROUP_ID!

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