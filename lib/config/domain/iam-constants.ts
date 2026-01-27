// lib/config/iam/iam-constants.ts
export const IamConstants = {
    principal: {
        ecsTasks: 'ecs-tasks.amazonaws.com'
    },

    roleArea: {
        //ecs
        ecsTask: 'ecs-task',
        ecsTaskExecution: 'ecs-task-execution'
    }


} as const

export type IamRoleArea = (typeof IamConstants.roleArea)[keyof typeof IamConstants.roleArea]