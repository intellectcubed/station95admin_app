#!/bin/bash
set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "==============================================="
echo "Updating Station95 Admin Backend on AWS"
echo "Environment: $ENVIRONMENT"
echo "==============================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "Updating Lambda functions..."
echo "----------------------------------------------"

if [ ! -f "backend/lambda/lambda-package.zip" ]; then
    echo "Building Lambda package..."
    cd backend/lambda
    ./build.sh
    cd ../..
fi

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

echo -e "${GREEN}✓ Lambda functions updated${NC}"

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "station95-api-${ENVIRONMENT}" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text \
  --region ${REGION} 2>/dev/null)

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo ""
if [ -n "$API_URL" ]; then
    echo "API Gateway URL: $API_URL"
    echo ""
    echo "To update static files on GitHub Pages:"
    echo "  1. Make changes to dist/"
    echo "  2. git add dist/ && git commit -m 'Update static files'"
    echo "  3. git push origin main"
    echo "  (GitHub Pages will auto-deploy in ~1 minute)"
fi
echo ""
