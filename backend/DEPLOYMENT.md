# Deployment Guide - Local vs AWS

This project supports **two deployment modes**:

1. **Local Development** - FastAPI with Jinja2 templates (traditional server-side rendering)
2. **AWS Production** - Serverless architecture with S3/CloudFront + Lambda/API Gateway

## Quick Start

### Local Development

```bash
# Run locally with FastAPI (no changes needed)
source venv/bin/activate
uvicorn app.main:app --reload --port 8080

# Access at: http://localhost:8080
```

**Uses:**
- `app/templates/` - Jinja2 templates (server-rendered)
- `app/static/` - CSS/JS files
- `app/main.py` - FastAPI backend

### AWS Deployment

```bash
# Deploy to AWS (serverless)
cd cloudformation
# Follow instructions in cloudformation/README.md
```

**Uses:**
- `dist/` - Static HTML files (client-rendered)
- `lambda/` - Lambda function handlers
- `cloudformation/` - Infrastructure as Code

## File Organization

```
backend/
├── app/
│   ├── main.py                 # FastAPI app (LOCAL ONLY)
│   ├── templates/              # Jinja2 templates (LOCAL ONLY)
│   │   ├── login.html         # Server-rendered version
│   │   └── admin.html         # Server-rendered version
│   └── static/                 # Shared static files
│       ├── style.css
│       ├── script.js
│       └── ...
│
├── dist/                       # AWS static files
│   ├── index.html             # Static version of login
│   ├── admin.html             # Static version of admin
│   ├── css/                   # Copied from app/static/
│   └── js/                    # Copied from app/static/
│
├── lambda/                     # AWS Lambda handlers
│   ├── login_handler.py
│   ├── calendar_handler.py
│   ├── api_proxy_handler.py
│   └── requirements.txt
│
└── cloudformation/             # AWS Infrastructure
    ├── main.yaml
    ├── s3-cloudfront.yaml
    ├── lambda-functions.yaml
    ├── api-gateway.yaml
    └── README.md
```

## Key Differences

| Aspect | Local (FastAPI) | AWS (Serverless) |
|--------|----------------|------------------|
| **HTML** | `app/templates/*.html` (Jinja2) | `dist/*.html` (static) |
| **Backend** | `app/main.py` (FastAPI routes) | `lambda/*.py` (Lambda handlers) |
| **Auth** | Server-side cookies | Client-side localStorage |
| **Static Files** | Served by FastAPI | S3 + CloudFront |
| **API Endpoints** | FastAPI routes | API Gateway + Lambda |
| **Cost** | Server always running | Pay per request |

## Development Workflow

### Making Changes to HTML

**For local development:**
- Edit `app/templates/login.html` or `app/templates/admin.html`
- Changes appear immediately (FastAPI auto-reload)

**For AWS deployment:**
- Edit `dist/index.html` or `dist/admin.html`
- Run `aws s3 sync dist/ s3://bucket-name/`
- Invalidate CloudFront cache

### Making Changes to CSS/JS

Static files are shared between both modes:

```bash
# 1. Edit files in app/static/
vim app/static/style.css

# 2. Copy to dist/ for AWS
cp app/static/*.css dist/css/
cp app/static/*.js dist/js/

# 3. Deploy to AWS (if needed)
aws s3 sync dist/ s3://bucket-name/
```

### Making Changes to Backend Logic

**For local development:**
- Edit `app/main.py`
- FastAPI auto-reloads

**For AWS deployment:**
- Edit `lambda/*.py`
- Redeploy Lambda functions:
  ```bash
  cd lambda
  zip -r lambda-package.zip *.py
  aws lambda update-function-code \
    --function-name station95-login-dev \
    --zip-file fileb://lambda-package.zip
  ```

## Why Two Approaches?

### Local Development Benefits
- Fast iteration (no deployment needed)
- Easy debugging (direct server logs)
- No AWS costs during development
- Familiar FastAPI patterns

### AWS Serverless Benefits
- Highly scalable (handles traffic spikes)
- Pay only for actual usage (~$1/month at low traffic)
- No server management
- Global CDN for static files (CloudFront)
- Automatic HTTPS
- High availability

## Migration Path

When ready to deploy to AWS:

1. ✅ Static HTML files already created in `dist/`
2. ✅ Lambda handlers already created in `lambda/`
3. ✅ CloudFormation templates ready in `cloudformation/`
4. Follow deployment steps in `cloudformation/README.md`

## Keeping Both in Sync

The templates are **intentionally kept separate** to support both modes:

- `app/templates/` uses Jinja2 syntax (e.g., `{{ user }}`)
- `dist/` uses vanilla HTML + JavaScript (e.g., `<span id="user"></span>`)

When updating UI:
1. Make changes to local templates first
2. Test locally with FastAPI
3. Once satisfied, update the static versions in `dist/`
4. Deploy to AWS

## Which Should I Use?

**Use Local (FastAPI) when:**
- Developing new features
- Debugging issues
- Running on your laptop
- Learning the codebase

**Use AWS (Serverless) when:**
- Deploying to production
- Need high availability
- Want to minimize costs
- Serving real users

Both approaches work with the **same codebase** - just different entry points!
