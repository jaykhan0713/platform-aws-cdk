import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'

//TODO
export class CicdImports {

    public static githubConnectionArn(scope: cdk.Stack, exportingStackName: string) {
        return cdk.Fn.importValue(`${exportingStackName}-GithubConnectionArn`)
    }

    public static artifactsBucket(scope: cdk.Stack, exportingStackName: string): s3.IBucket {
        const bucketName = cdk.Fn.importValue(
            `${exportingStackName}-PipelineArtifactsBucketName`
        )

        return s3.Bucket.fromBucketName(
            scope,
            'ImportedPipelineArtifactsBucket',
            bucketName
        )
    }
}
