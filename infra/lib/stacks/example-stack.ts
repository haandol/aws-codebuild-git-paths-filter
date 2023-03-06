import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DeployPipeline } from './nested/deploy-pipeline-stack';

interface IProps extends cdk.StackProps {
  codeRepositoryName: string;
  pathFilters: string[];
}

export class ExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);

    new DeployPipeline(this, 'DeployPipeline', {
      codeRepositoryName: props.codeRepositoryName,
      pathFilters: props.pathFilters,
    });
  }
}
