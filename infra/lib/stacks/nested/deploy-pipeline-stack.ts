import { RemovalPolicy, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as s3 from 'aws-cdk-lib/aws-s3';

interface IProps extends NestedStackProps {
  codeRepositoryName: string;
  pathFilters: string[];
}

export class DeployPipeline extends NestedStack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      autoDeleteObjects: true,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'bucket-logs/',
    });

    const role = this.newPipelineRole();
    artifactBucket.grantReadWrite(role);

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      role,
      artifactBucket,
      restartExecutionOnUpdate: false,
      crossAccountKeys: false,
    });

    // source stage
    const repository = codecommit.Repository.fromRepositoryName(
      this,
      `GitRepository`,
      props.codeRepositoryName
    );
    const checkoutStage = pipeline.addStage({ stageName: 'Source' });
    const sourceOutput = codepipeline.Artifact.artifact('source');
    checkoutStage.addAction(
      new cpactions.CodeCommitSourceAction({
        output: sourceOutput,
        branch: 'main',
        actionName: 'checkoutSource',
        codeBuildCloneOutput: true,
        repository,
      })
    );

    // build stage
    const project = this.newBuildProject(pipeline, props);
    const buildOutput = codepipeline.Artifact.artifact('build');
    const buildStage = pipeline.addStage({ stageName: 'Build' });
    buildStage.addAction(
      new cpactions.CodeBuildAction({
        actionName: 'build',
        input: sourceOutput,
        project,
        outputs: [buildOutput],
      })
    );
  }

  private createBuildRole() {
    const role = new iam.Role(this, 'BuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          // SecretsManager
          'secretsmanager:ListSecretVersionIds',
          'secretsmanager:DescribeSecret',
          'secretsmanager:GetSecretValue',
          // Artifacts
          's3:ListBucket',
          's3:GetObject',
          's3:CopyObject',
          's3:PutObject',
          'kms:Decrypt',
          // Codepipeline
          'codepipeline:StopPipelineExecution',
          'codepipeline:GetPipelineState',
        ],
        resources: ['*'],
        effect: iam.Effect.ALLOW,
      })
    );
    return role;
  }

  private newPipelineRole(): iam.Role {
    const role = new iam.Role(this, 'PipelineRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
    });
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          // codecommit
          'codecommit:GitPull',
          'codecommit:GetBranch',
          'codecommit:GetCommit',
          'codecommit:UploadArchive',
          'codecommit:GetUploadArchiveStatus',
          'codecommit:CancelUploadArchive',
          'codecommit:GetRepository',
          // codebuild
          'codebuild:BatchGetBuilds',
          'codebuild:StartBuild',
        ],
        resources: ['*'],
      })
    );
    // stop pipeline execution, you can stop codebuild job instead but it will show as failed in pipeline perspective
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'codepipeline:StopPipelineExecution',
          'codepipeline:GetPipelineState',
        ],
        resources: ['*'],
      })
    );

    return role;
  }

  private newBuildProject(pipeline: codepipeline.IPipeline, props: IProps) {
    const role = this.createBuildRole();

    const preBuildCommands = [
      'echo "ref[$CODEBUILD_RESOLVED_SOURCE_VERSION]"',
      'echo "build_id[$CODEBUILD_BUILD_ID]"',
    ];
    const buildCommands = [
      'STOP_PIPELINE=true',
      ...props.pathFilters.map(
        (path: string) =>
          `git diff --quiet $CODEBUILD_RESOLVED_SOURCE_VERSION~1 $CODEBUILD_RESOLVED_SOURCE_VERSION -- ${path} || STOP_PIPELINE="false"`
      ),
      'if [ "$STOP_PIPELINE" = "true" ]; then ./scripts/stop-pipeline.sh; fi',
    ];
    const postBuildCommands = [
      'echo "your commit went through all filters!!!"',
    ];

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environmentVariables: {
        PIPELINE_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: pipeline.pipelineName,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: { commands: preBuildCommands },
          build: { commands: buildCommands },
          post_build: { commands: postBuildCommands },
        },
      }),
      role,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
      },
    });

    return buildProject;
  }
}
