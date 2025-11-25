"""
Lambda handler for /api endpoint
Proxies GET requests to calendar service
"""
import json
import os
import httpx


async def async_handler(event, context):
    """
    Proxy API requests to calendar service
    """
    try:
        # Get query parameters
        query_params = event.get('queryStringParameters', {})

        # Get calendar service URL from environment
        calendar_url = os.environ.get('CALENDAR_URL', 'http://localhost:8000')

        # Build query string
        query_string = '&'.join([f"{k}={v}" for k, v in query_params.items()])
        target_url = f"{calendar_url}?{query_string}" if query_string else calendar_url

        # Forward GET request to calendar service
        async with httpx.AsyncClient() as client:
            response = await client.get(target_url)

            return {
                'statusCode': response.status_code,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': response.text
            }

    except Exception as e:
        print(f"API proxy error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'detail': str(e)})
        }


def lambda_handler(event, context):
    """
    Synchronous wrapper for async handler
    """
    import asyncio
    return asyncio.run(async_handler(event, context))
