"""
Lambda handler for /login endpoint
"""
import json
import os
from supabase import create_client, Client


def lambda_handler(event, context):
    """
    Handle POST /login requests
    Authenticates user with Supabase and returns user info
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')

        if not email or not password:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'detail': 'Email and password required'})
            }

        # Initialize Supabase client
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_KEY')
        supabase: Client = create_client(supabase_url, supabase_key)

        # Authenticate with Supabase
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        # Return user info
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'user': {
                    'email': response.user.email,
                    'id': response.user.id,
                }
            })
        }

    except Exception as e:
        print(f"Login error: {str(e)}")
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'detail': 'Invalid credentials'})
        }
