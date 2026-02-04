export const IamConstants = {
    principal: {
        ecsTasks: 'ecs-tasks.amazonaws.com',
        codeBuild: 'codebuild.amazonaws.com'
    },

    roleArea: {
        //ecs
        ecsTask: 'ecs-task',
        ecsTaskExecution: 'ecs-task-execution',

        //codebuild
        codebuildDocker: 'codebuild-docker',
        codebuildDeploy: 'codebuild-deploy'
    }


} as const

export type IamRoleArea = (typeof IamConstants.roleArea)[keyof typeof IamConstants.roleArea]