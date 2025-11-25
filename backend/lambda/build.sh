 #!/bin/bash
  set -e

  echo "Building Lambda deployment package..."

  # Clean previous builds
  rm -rf package lambda-package.zip

  # Build in Docker
  docker run --rm \
    -v $(pwd):/app \
    -w /app \
    python:3.11-slim \
    pip install -r requirements.txt -t package

  # Create zip
  cd package
  zip -r ../lambda-package.zip .
  cd ..
  zip -g lambda-package.zip *.py

  # Clean up
  rm -rf package

  echo "✓ Built lambda-package.zip ($(du -h lambda-package.zip | cut -f1))"

  Then just:
  cd lambda
  chmod +x build.sh
  ./build.sh
