#!/bin/bash
set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "==============================================="
echo "Deploying Station95 Admin Backend to AWS"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Frontend: GitHub Pages (not AWS)"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

# Check if lambda package exists
if [ ! -f "backend/lambda/lambda-package.zip" ]; then
    echo -e "${YELLOW}Lambda package not found. Building...${NC}"
    cd backend/lambda
    ./build.sh
    cd ../..
fi

echo ""
echo "Step 1/3: Deploying Lambda functions stack..."
echo "----------------------------------------------"

aws cloudformation create-stack \
  --stack-name "station95-lambda-${ENVIRONMENT}" \
  --template-body file://backend/cloudformation/lambda-functions.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
    ParameterKey=SupabaseUrl,ParameterValue=${SUPABASE_URL} \
    ParameterKey=SupabaseKey,ParameterValue=${SUPABASE_KEY} \
    ParameterKey=CalendarServiceUrl,ParameterValue=${CALENDAR_URL:-http://localhost:8000} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}

echo "Waiting for Lambda stack creation..."
aws cloudformation wait stack-create-complete \
  --stack-name "station95-lambda-${ENVIRONMENT}" \
  --region ${REGION}

echo -e "${GREEN}✓ Lambda functions created${NC}"

echo ""
echo "Step 2/3: Deploying Lambda function code..."
echo "----------------------------------------------"

# Get function names and update code
FUNCTIONS=("login" "calendar" "api-proxy")
for func in "${FUNCTIONS[@]}"; do
    FUNCTION_NAME="station95-${func}-${ENVIRONMENT}"
    echo "Updating $FUNCTION_NAME..."
    aws lambda update-function-code \
      --function-name "$FUNCTION_NAME" \
      --zip-file fileb://backend/lambda/lambda-package.zip \
      --region ${REGION} \
      > /dev/null
done

echo -e "${GREEN}✓ Lambda code deployed${NC}"

echo ""
echo "Step 3/3: Deploying API Gateway stack..."
echo "----------------------------------------------"

aws cloudformation create-stack \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --template-body file://backend/cloudformation/api-gateway.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
    ParameterKey=LambdaStackName,ParameterValue="station95-lambda-${ENVIRONMENT}" \
  --region ${REGION}

echo "Waiting for API Gateway stack creation..."
aws cloudformation wait stack-create-complete \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --region ${REGION}

echo -e "${GREEN}✓ API Gateway deployed${NC}"

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text \
  --region ${REGION})

echo ""
echo "==============================================="
echo -e "${GREEN}Backend Deployment Complete!${NC}"
echo "==============================================="
echo ""
echo "AWS Resources created:"
echo "  • Lambda Functions: station95-{login,calendar,api-proxy}-${ENVIRONMENT}"
echo "  • API Gateway: $API_URL"
echo ""
echo "Next steps for GitHub Pages:"
echo ""
echo "  1. Update API URL in your static files:"
echo "     sed -i '' \"s|http://localhost:8080|${API_URL}|g\" docs/index.html"
echo "     sed -i '' \"s|http://localhost:8080|${API_URL}|g\" docs/admin.html"
echo ""
echo "  2. Deploy to GitHub Pages:"
echo "     - Remove docs/ from .gitignore"
echo "     - git add docs/ && git commit -m 'Add static files'"
echo "     - git push origin main"
echo "     - Enable GitHub Pages in repo settings → Pages → Source: main → Folder: /dist"
echo ""
echo "  3. Your site will be at:"
echo "     https://YOUR_USERNAME.github.io/station95admin_app/"
echo ""
echo "To update Lambda code:"
echo "  cd backend/lambda && ./build.sh && cd ../.. && ./update.sh $ENVIRONMENT"
echo ""
