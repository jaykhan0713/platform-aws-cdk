import { ECSClient, UpdateServiceCommand } from '@aws-sdk/client-ecs';
import {
    ApplicationAutoScalingClient,
    RegisterScalableTargetCommand, ScalableDimension,
    ServiceNamespace,
} from '@aws-sdk/client-application-auto-scaling';

const scalingClient = new ApplicationAutoScalingClient();
const ecsClient = new ECSClient()

interface InvokeFargateUpdaterEvent {
    isBusinessHours?: boolean
}

export const handler = async (event: InvokeFargateUpdaterEvent) => {
    const serviceArn = process.env.SERVICE_ARN
    const resourceId = process.env.RESOURCE_ID
    const clusterName = process.env.CLUSTER_NAME
    const serviceName = process.env.SERVICE_NAME

    if (!(serviceArn && resourceId && clusterName && serviceName)) {
        throw new Error('Missing required ENV variable(s)')
    }

    //update auto scaling configs first

    const scalingCommand = new RegisterScalableTargetCommand({
        ServiceNamespace: ServiceNamespace.ECS,
        ResourceId: resourceId,
        ScalableDimension: ScalableDimension.ECSServiceDesiredCount,

        //TODO: have this and max custom passed in, can reuse lambda sleep/wake scripts with lambda too
        MinCapacity: !event.isBusinessHours ? 1 : 2
    })

    const scalingClientResponse = await scalingClient.send(scalingCommand)

    const updateServiceCommand = new UpdateServiceCommand({
        cluster: clusterName,
        service: serviceName,
        desiredCount: !event.isBusinessHours ? 1 : 2
    })

    const ecsClientResponse = await ecsClient.send(updateServiceCommand)

    return {
        statusCode: 200,
        body: JSON.stringify({
            scalingStatusCode: scalingClientResponse.$metadata.httpStatusCode,
            ecsStatusCode: ecsClientResponse.$metadata.httpStatusCode,
        })
    }
}