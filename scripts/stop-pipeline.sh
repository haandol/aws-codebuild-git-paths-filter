#!/bin/bash

echo "your commit did not match any filters, stopping build..."

PIPELINE_NAME=`echo $CODEBUILD_BUILD_ID | cut -d '/' -f 2 | cut -d ':' -f 1`
echo "pipeline name $PIPELINE_NAME"

PIPELINE_QUERY="stageStates[?actionStates[?latestExecution.externalExecutionId==$CODEBUILD_BUILD_ID]].latestExecution.pipelineExecutionId"
echo "pipeline query $PIPELINE_QUERY"

PIPELINE_EXECUTION_ID=$(aws codepipeline get-pipeline-state --name $PIPELINE_NAME --query "'$PIPELINE_QUERY'" --output text)
echo "stopping pipeline execution $PIPELINE_EXECUTION_ID"

aws codepipeline stop-pipeline-execution --pipeline-name $PIPELINE_NAME --pipeline-execution-id $PIPELINE_EXECUTION_ID
