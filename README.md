# Codebuild path filters example for Codecommit

This is an example of using the git-paths-filter to filter out changes to files that are not relevant to the build.

Deploying this cdk will provision below architeture on you AWS Account.

![](/imgs/architecture.png)

# Prerequisites

- awscli
- Nodejs 16.x+
- AWS Account and Locally configured AWS credential

# Installation

Install project dependencies

```bash
$ npm i
```

Install cdk in global context and run `cdk bootstrap` if you did not initailize cdk yet.

```bash
$ npm i -g aws-cdk
$ cdk bootstrap
```

# Configuration

## Create Codecommit repository

Create codecommit repository on AWS console or using awscli.

```bash
$ aws codecommit create-repository --repository-name path-filters-demo
```

## Set dotenv file

open [**infra/env/dev.env**](/infra/env/dev.env) and fill the blow fields

- CODE_REPOSITORY_NAME : codecommit repository name, e.g. "path-filters-demo"
- CODE_PATH_FILTERS : comma seperated folder paths. each folder will act as `or` condition. if you commit something one of these folders, codebuild won't stop. e.g. "infra/lib/functions,infra/lib/stacks"

and copy `env/dev.env` file to project root as `.env`

```bash
$ cd infra
$ cp env/dev.env .env
```

# Deploy

Deploy CDK Stacks on AWS

```bash
$ cd -
$ cdk deploy "*" --require-approval never
```

# Test

visit codepipeline AWS console and check the pipeline is running after commit something under infra folder.

below text will be printed on codebuild console if your commit is well filtered.

```bash
...
your commit went through all filters!!!
```

or codebuild will stop with below error message if your commit does not have nothing to do with the filter folders.

```bash
...
your commit did not match any filters, stopping build...
```
