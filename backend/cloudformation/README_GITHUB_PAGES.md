# Station95 Admin - Deployment Guide (GitHub Pages + AWS)

This guide covers deploying the Station95 Admin app with:
- **Frontend**: GitHub Pages (free static hosting)
- **Backend**: AWS Lambda + API Gateway (serverless)

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─── Static Assets ───→ GitHub Pages (FREE)
       │    (HTML/CSS/JS)      username.github.io/repo
       │
       └─── API Calls ───────→ API Gateway ───→ Lambda ───→ Supabase
                                (AWS - pay per use)
```

## Prerequisites

1. **AWS CLI** configured: `aws configure`
2. **Docker** installed (for building Lambda packages)
3. **Supabase** account with credentials
4. **GitHub** repository

## Step 1: Deploy AWS Backend

### Set Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-supabase-anon-key"
export CALENDAR_URL="http://your-calendar-service:8000"  # Optional
export AWS_REGION="us-east-1"
```

### Run Deployment Script

```bash
cd backend
./deploy.sh dev
```

This creates:
- 3 Lambda functions (login, calendar, api-proxy)
- API Gateway with CORS enabled
- IAM roles and permissions

**Output will include your API Gateway URL:**
```
API Gateway: https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
```

**Save this URL!** You'll need it for the next step.

## Step 2: Configure Static Files

Update your static files with the API Gateway URL:

```bash
cd backend

# Replace localhost with your API Gateway URL
API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/dev"

sed -i '' "s|http://localhost:8080|${API_URL}|g" dist/index.html
sed -i '' "s|http://localhost:8080|${API_URL}|g" dist/admin.html
```

## Step 3: Deploy to GitHub Pages

### Option A: Deploy from /dist folder on main branch

```bash
# 1. Add .nojekyll to prevent Jekyll processing
touch dist/.nojekyll

# 2. Remove dist/ from .gitignore
sed -i '' '/^dist\/$/d' .gitignore

# 3. Commit and push
git add dist/ .gitignore
git commit -m "Deploy static files to GitHub Pages"
git push origin main
```

Then on GitHub:
1. Go to **Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main`
4. **Folder**: `/backend/dist` (or wherever your dist/ is)
5. Click **Save**

### Option B: Deploy to gh-pages branch

```bash
# 1. Create orphan branch
git checkout --orphan gh-pages

# 2. Remove everything except dist/
git rm -rf .
cp -r backend/dist/* .
touch .nojekyll

# 3. Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# 4. Return to main
git checkout main
```

Then on GitHub:
1. Go to **Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `gh-pages`
4. **Folder**: `/ (root)`
5. Click **Save**

## Step 4: Access Your App

After 1-2 minutes, your site will be live at:
```
https://YOUR_USERNAME.github.io/station95admin_app/
```

(Check GitHub Settings → Pages for the exact URL)

## Updating

### Update Lambda Functions

```bash
cd backend/lambda
./build.sh              # Rebuild package
cd ..
./update.sh dev         # Deploy to AWS
```

### Update Static Files

```bash
# Make changes to backend/dist/

# Option A (if using main branch):
git add dist/
git commit -m "Update UI"
git push origin main

# Option B (if using gh-pages branch):
git checkout gh-pages
cp -r backend/dist/* .
git add .
git commit -m "Update UI"
git push origin gh-pages
git checkout main
```

GitHub Pages updates automatically in 1-2 minutes.

## Troubleshooting

### CORS Errors

If you see CORS errors in browser console:
1. Check API Gateway has CORS enabled (already configured in cloudformation/api-gateway.yaml)
2. Verify Lambda functions return CORS headers (already configured in lambda handlers)
3. Make sure you're using HTTPS (GitHub Pages uses HTTPS automatically)

### Lambda Errors

View Lambda logs:
```bash
aws logs tail /aws/lambda/station95-login-dev --follow
```

### API Gateway Not Found

Make sure you deployed the backend:
```bash
aws cloudformation describe-stacks --stack-name station95-api-dev
```

## Cost Estimate

**GitHub Pages**: Free
**AWS (Lambda + API Gateway)**:
- First 1M requests/month: Free tier
- After that: ~$3-5 per million requests
- Typical low-traffic app: **$0-1/month**

## Cleanup

### Delete AWS Resources

```bash
# Delete API Gateway
aws cloudformation delete-stack --stack-name station95-api-dev

# Delete Lambda functions
aws cloudformation delete-stack --stack-name station95-lambda-dev
```

### Remove GitHub Pages

1. Go to **Settings → Pages**
2. **Source**: None
3. (Optional) Delete the gh-pages branch

## Alternative: All-AWS Deployment

If you want to use S3 + CloudFront instead of GitHub Pages, see the `aws-cloudfront-deployment` branch:

```bash
git checkout aws-cloudfront-deployment
```

That branch includes S3/CloudFront deployment scripts and CloudFormation templates.
