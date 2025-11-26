"""
Lambda handler to proxy ALL requests to calendar-service-production API Gateway
Handles both /api queries and /calendar/* paths
"""
import json
import os
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import requests

# Cache for Supabase credentials
_supabase_credentials = None


def get_supabase_credentials():
    """
    Retrieve Supabase credentials from AWS Secrets Manager.
    Cached after first retrieval.

    Returns:
        dict: Dictionary with SUPABASE_URL and SUPABASE_KEY
    """
    global _supabase_credentials

    if _supabase_credentials is not None:
        return _supabase_credentials

    secret_name = os.environ.get('SECRET_NAME', 'calendar-service-secrets-production')

    try:
        session = boto3.session.Session()
        client = session.client(service_name='secretsmanager', region_name='us-east-1')

        get_secret_value_response = client.get_secret_value(SecretId=secret_name)

        # Parse the secret string (JSON format)
        secret_dict = json.loads(get_secret_value_response['SecretString'])

        _supabase_credentials = {
            'SUPABASE_URL': secret_dict.get('SUPABASE_URL'),
            'SUPABASE_KEY': secret_dict.get('SUPABASE_KEY')
        }

        print(f"Successfully retrieved Supabase credentials from secret: {secret_name}")
        return _supabase_credentials

    except Exception as e:
        print(f"Error retrieving secret {secret_name}: {str(e)}")
        # Return None values if secret retrieval fails
        return {'SUPABASE_URL': None, 'SUPABASE_KEY': None}


def lambda_handler(event, context):
    """
    Proxy ALL calendar requests to IAM-protected calendar API Gateway

    Routes:
    - GET /api?action=X&date=Y → /?action=X&date=Y
    - POST /calendar/day/{date}/preview → /calendar/day/{date}/preview
    - POST /calendar/day/{date}/apply → /calendar/day/{date}/apply
    """
    try:
        print(f"Event: {json.dumps(event)}")

        # Load Supabase credentials (cached for subsequent invocations)
        supabase_creds = get_supabase_credentials()
        print(f"Supabase credentials loaded: {supabase_creds['SUPABASE_URL'] is not None}")

        # Calendar API Gateway endpoint (IAM protected)
        calendar_api_url = os.environ.get(
            'CALENDAR_API_URL',
            'https://yw56b3bspc.execute-api.us-east-1.amazonaws.com/v1'
        )

        # Get request details
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        query_params = event.get('queryStringParameters', {}) or {}
        body = event.get('body', '')

        # Build target URL
        if path.startswith('/api'):
            # /api queries → root with query params
            query_string = '&'.join([f"{k}={v}" for k, v in query_params.items()])
            target_url = f"{calendar_api_url}/?{query_string}" if query_string else f"{calendar_api_url}/"
        elif path.startswith('/calendar'):
            # /calendar/* paths → pass through
            # Replace path parameters from API Gateway format
            # e.g., /calendar/day/20251125/preview
            target_url = f"{calendar_api_url}{path}"
        else:
            raise ValueError(f"Unsupported path: {path}")

        print(f"Target URL: {target_url}")
        print(f"Method: {http_method}")

        # Create AWS signed request
        session = boto3.Session()
        credentials = session.get_credentials()

        # Prepare request data
        request_kwargs = {
            'method': http_method,
            'url': target_url,
        }

        if body:
            request_kwargs['data'] = body

        # Create and sign the request
        aws_request = AWSRequest(**request_kwargs)
        SigV4Auth(credentials, 'execute-api', 'us-east-1').add_auth(aws_request)

        # Make the signed request
        response = requests.request(
            method=http_method,
            url=target_url,
            headers=dict(aws_request.headers),
            data=body if body else None
        )

        print(f"Response status: {response.status_code}")

        return {
            'statusCode': response.status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': response.text
        }

    except Exception as e:
        print(f"Proxy error: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'Failed to proxy request to calendar service'
            })
        }
