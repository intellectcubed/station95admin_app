#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "Redeploying API Gateway for environment: $ENVIRONMENT"

# Delete existing API Gateway stack
echo "Deleting existing API Gateway stack..."
aws cloudformation delete-stack \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --region ${REGION}

echo "Waiting for deletion to complete..."
aws cloudformation wait stack-delete-complete \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --region ${REGION}

echo "Creating new API Gateway stack..."
aws cloudformation create-stack \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --template-body file://backend/cloudformation/api-gateway.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
    ParameterKey=LambdaStackName,ParameterValue="station95-lambda-${ENVIRONMENT}" \
  --region ${REGION}

echo "Waiting for creation to complete..."
aws cloudformation wait stack-create-complete \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --region ${REGION}

# Get new API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text \
  --region ${REGION})

echo ""
echo "API Gateway redeployed successfully!"
echo "New URL: $API_URL"
echo ""
echo "Update docs/js/config.js with this URL if it changed."
