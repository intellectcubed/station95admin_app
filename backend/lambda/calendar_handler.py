"""
Lambda handler for calendar endpoints
/calendar/day/{date}/preview
/calendar/day/{date}/apply
"""
import json
import os
import httpx


async def async_handler(event, context):
    """
    Handle calendar preview and apply requests
    Proxies requests to the calendar service
    """
    try:
        # Get path parameters
        path = event.get('path', '')
        method = event.get('httpMethod', 'POST')
        body = event.get('body', '{}')

        # Extract date from path
        # Path format: /calendar/day/2024-01-15/preview
        path_parts = path.split('/')
        if len(path_parts) < 5:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'detail': 'Invalid path'})
            }

        date = path_parts[3]  # Extract date
        action = path_parts[4]  # preview or apply

        # Get calendar service URL from environment
        calendar_url = os.environ.get('CALENDAR_URL', 'http://localhost:8000')
        target_url = f"{calendar_url}/calendar/day/{date}/{action}"

        # Forward request to calendar service
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=target_url,
                content=body,
                headers={'Content-Type': 'application/json'}
            )

            return {
                'statusCode': response.status_code,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': response.text
            }

    except Exception as e:
        print(f"Calendar handler error: {str(e)}")
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
    Lambda requires synchronous handler
    """
    import asyncio
    return asyncio.run(async_handler(event, context))
