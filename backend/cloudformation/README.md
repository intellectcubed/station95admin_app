# Station95 Admin - AWS Deployment Guide

This directory contains CloudFormation templates to deploy the Station95 Admin application to AWS.

## Architecture Overview

**Current Approach (GitHub Pages + AWS Backend):**

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─── Static Assets ───→ GitHub Pages
       │    (HTML/CSS/JS)      (Free hosting)
       │
       └─── API Calls ───────→ API Gateway ───→ Lambda ───→ Supabase/Calendar
                                (AWS Backend)
```

**Alternative Approach (All AWS):**
For the S3 + CloudFront approach, see branch: `aws-cloudfront-deployment`

## Directory Structure

```
cloudformation/
├── lambda-functions.yaml    # Backend Lambda functions (USED)
├── api-gateway.yaml         # REST API configuration (USED)
├── s3-cloudfront.yaml       # S3/CloudFront (NOT USED - see aws-cloudfront-deployment branch)
├── main.yaml                # All-in-one stack (NOT USED - see aws-cloudfront-deployment branch)
└── README.md                # This file

dist/                        # Static files for GitHub Pages
├── index.html              # Login page
├── admin.html              # Admin dashboard
├── css/                    # Stylesheets
└── js/                     # JavaScript files

lambda/                      # Lambda function code
├── login_handler.py
├── calendar_handler.py
├── api_proxy_handler.py
└── requirements.txt
```

## Prerequisites

1. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```

2. **AWS Account** with permissions to create:
   - S3 buckets
   - CloudFront distributions
   - Lambda functions
   - API Gateway
   - IAM roles

3. **Supabase credentials** (URL and API key)

## Deployment Steps (GitHub Pages + AWS Backend)

### Quick Deploy Using Script (Recommended)

```bash
# 1. Package Lambda functions
cd lambda
pip install -r requirements.txt -t ./package
cd package
zip -r ../lambda-package.zip .
cd ..
zip -g lambda-package.zip *.py
cd ..

# 2. Upload templates to S3 (required for nested stacks)
aws s3 mb s3://your-cloudformation-templates-bucket
aws s3 cp cloudformation/ s3://your-cloudformation-templates-bucket/station95/ --recursive

# 3. Deploy main stack
aws cloudformation create-stack \
  --stack-name station95-admin-dev \
  --template-body file://cloudformation/main.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=dev \
    ParameterKey=SupabaseUrl,ParameterValue=https://your-project.supabase.co \
    ParameterKey=SupabaseKey,ParameterValue=your-supabase-key \
    ParameterKey=CalendarServiceUrl,ParameterValue=https://your-calendar-service.com \
  --capabilities CAPABILITY_NAMED_IAM

# 4. Wait for stack creation
aws cloudformation wait stack-create-complete --stack-name station95-admin-dev

# 5. Get outputs
aws cloudformation describe-stacks \
  --stack-name station95-admin-dev \
  --query 'Stacks[0].Outputs'
```

### Option 2: Deploy Stacks Individually

#### Step 1: Deploy S3 + CloudFront

```bash
aws cloudformation create-stack \
  --stack-name station95-frontend-dev \
  --template-body file://cloudformation/s3-cloudfront.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev
```

#### Step 2: Deploy Lambda Functions

```bash
# Package Lambda code first (see above)

aws cloudformation create-stack \
  --stack-name station95-lambda-dev \
  --template-body file://cloudformation/lambda-functions.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=dev \
    ParameterKey=SupabaseUrl,ParameterValue=https://your-project.supabase.co \
    ParameterKey=SupabaseKey,ParameterValue=your-supabase-key \
    ParameterKey=CalendarServiceUrl,ParameterValue=https://your-calendar-service.com \
  --capabilities CAPABILITY_NAMED_IAM
```

#### Step 3: Update Lambda Function Code

The CloudFormation templates create Lambda functions with placeholder code. Deploy actual code:

```bash
# Update each function
aws lambda update-function-code \
  --function-name station95-login-dev \
  --zip-file fileb://lambda/lambda-package.zip

aws lambda update-function-code \
  --function-name station95-calendar-dev \
  --zip-file fileb://lambda/lambda-package.zip

aws lambda update-function-code \
  --function-name station95-api-proxy-dev \
  --zip-file fileb://lambda/lambda-package.zip
```

#### Step 4: Deploy API Gateway

```bash
aws cloudformation create-stack \
  --stack-name station95-api-dev \
  --template-body file://cloudformation/api-gateway.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=dev \
    ParameterKey=LambdaStackName,ParameterValue=station95-lambda-dev
```

#### Step 5: Upload Static Files to S3

```bash
# Get bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name station95-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name station95-api-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

# Update dist/index.html and dist/admin.html to use API_URL
# Replace: window.API_BASE_URL || 'http://localhost:8080'
# With: window.API_BASE_URL || 'https://YOUR_API_GATEWAY_URL'

# Upload files
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name station95-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## Configuration

### Setting API Gateway URL in Static Files

After deploying API Gateway, update the static HTML files:

```javascript
// In dist/index.html and dist/admin.html
window.API_BASE_URL = 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev';
```

Or use environment-specific config files:

```javascript
// dist/js/config.js
const CONFIG = {
  dev: {
    API_BASE_URL: 'http://localhost:8080'
  },
  prod: {
    API_BASE_URL: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod'
  }
};

window.API_BASE_URL = CONFIG[window.ENVIRONMENT || 'dev'].API_BASE_URL;
```

## Local Development vs AWS Deployment

### Local Development (FastAPI)

```bash
# Run locally with FastAPI
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8080
```

Accesses:
- Templates: `app/templates/`
- Static files: `app/static/`
- Backend: FastAPI routes in `app/main.py`

### AWS Deployment (Serverless)

```bash
# Deploy to AWS
./deploy.sh
```

Accesses:
- Static files: S3 + CloudFront
- Backend: Lambda + API Gateway

## Updating Deployments

### Update Static Files

```bash
# Sync changes to S3
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### Update Lambda Functions

```bash
# Repackage and deploy
cd lambda
pip install -r requirements.txt -t ./package
cd package
zip -r ../lambda-package.zip .
cd ..
zip -g lambda-package.zip *.py

# Update functions
aws lambda update-function-code \
  --function-name station95-login-dev \
  --zip-file fileb://lambda-package.zip
```

### Update CloudFormation Stacks

```bash
aws cloudformation update-stack \
  --stack-name station95-admin-dev \
  --template-body file://cloudformation/main.yaml \
  --parameters <same as create-stack>
```

## Cleanup

```bash
# Delete all stacks (in reverse order)
aws cloudformation delete-stack --stack-name station95-api-dev
aws cloudformation delete-stack --stack-name station95-lambda-dev

# Empty S3 bucket first
aws s3 rm s3://$BUCKET_NAME --recursive
aws cloudformation delete-stack --stack-name station95-frontend-dev
```

## Costs Estimate

Assuming low-medium traffic (1000 requests/day):

| Service | Usage | Est. Cost/Month |
|---------|-------|-----------------|
| S3 | 1 GB storage | $0.02 |
| CloudFront | 10 GB transfer | $0.85 |
| Lambda | 30K invocations | Free tier |
| API Gateway | 30K requests | Free tier |
| **Total** | | **~$1/month** |

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:
1. Check API Gateway CORS configuration in `api-gateway.yaml`
2. Verify Lambda functions return CORS headers
3. Ensure CloudFront allows OPTIONS requests

### Lambda Cold Starts

First request after idle time may be slow (2-5 seconds). Solutions:
- Use Lambda provisioned concurrency (increases cost)
- Keep Lambda warm with CloudWatch Events
- Accept cold starts for low-traffic applications

### CloudFront Cache Issues

Static files not updating:
```bash
# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## Next Steps

1. **Custom Domain**: Add Route53 + ACM certificate
2. **Authentication**: Consider AWS Cognito instead of Supabase
3. **Monitoring**: Set up CloudWatch dashboards and alarms
4. **CI/CD**: Automate deployment with GitHub Actions or AWS CodePipeline
