#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ExampleStack } from '../lib/stacks/example-stack';
import { Config } from '../lib/configs/loader';

const app = new cdk.App({
  context: {
    ns: Config.Ns,
  },
});

new ExampleStack(app, `${Config.Ns}ExampleStack`, {
  codeRepositoryName: Config.Codecommit.RepositoryName,
  pathFilters: Config.Codecommit.PathFilters,
});
