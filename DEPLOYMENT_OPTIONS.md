# Deployment Options Summary

This project supports multiple deployment configurations for flexibility.

## Current Setup (main branch)

**Frontend**: GitHub Pages
**Backend**: AWS Lambda + API Gateway

✅ **Pros:**
- Free static hosting (GitHub Pages)
- Pay-per-request backend (AWS Lambda)
- Lowest cost (~$0-1/month)
- Simple deployment

📖 **Guide**: `cloudformation/README_GITHUB_PAGES.md`

## Alternative Setup (aws-cloudfront-deployment branch)

**Frontend**: AWS S3 + CloudFront
**Backend**: AWS Lambda + API Gateway

✅ **Pros:**
- Fully AWS-managed
- Global CDN (CloudFront)
- Custom domain easier to set up
- Better for production/enterprise

💰 **Cost**: ~$1-5/month

📖 **Switch to it:**
```bash
git checkout aws-cloudfront-deployment
# See cloudformation/README.md for deployment guide
```

## Local Development (all branches)

**Frontend + Backend**: FastAPI + Uvicorn

```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8080
```

✅ Works with both deployment approaches
- `app/templates/` - Jinja2 templates for local dev
- `dist/` - Static HTML for deployments

---

## Quick Decision Guide

**Choose GitHub Pages (main branch) if:**
- You want free hosting
- Low traffic expected (<100K requests/month)
- You're okay with `username.github.io/repo` URL

**Choose CloudFront (aws-cloudfront-deployment) if:**
- You need custom domain (www.yoursite.com)
- Global CDN is important
- You want everything in AWS
- You have AWS credits

**Use Local Development when:**
- Building new features
- Debugging
- Testing before deployment
