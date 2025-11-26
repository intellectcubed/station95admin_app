I have the following components deployed: 
lambda: station95-api-proxy-dev (api-proxy-handler.py)
lambda: station95-calendar-dev  (the implementation to which api-proxy-handler makes calls to)

So we have (frontend: javascript) -> station95-api-proxy-dev -> (APIGateway) -> station95-calendar-dev 

- Remove station95-login-dev - not needed
- Put all calls into the station95-api-proxy-dev 
- Modify Lambda to sign requests automatically:

  import boto3
  import json
  from botocore.auth import SigV4Auth
  from botocore.awsrequest import AWSRequest
  import requests

  def lambda_handler(event, context):
      # API Gateway B URL
      api_url = "https://abc123.execute-api.us-east-1.amazonaws.com/v1"

      # Use boto3 session to get credentials
      session = boto3.Session()
      credentials = session.get_credentials()

      # Make request with IAM signing
      url = f"{api_url}/?action=get_schedule_day&date=20260110"

      # Create AWS request
      request = AWSRequest(method='GET', url=url)
      SigV4Auth(credentials, 'execute-api', session.region_name).add_auth(request)

      # Send request
      response = requests.get(url, headers=dict(request.headers))

      return {
          'statusCode': 200,
          'body': json.dumps(response.json())
      }

  Or simpler with requests-aws4auth:

  import requests
  from requests_aws4auth import AWS4Auth
  import boto3

  def lambda_handler(event, context):
      # Get credentials from Lambda's execution role
      session = boto3.Session()
      credentials = session.get_credentials()

      # Create auth
      auth = AWS4Auth(
          credentials.access_key,
          credentials.secret_key,
          session.region_name,
          'execute-api',
          session_token=credentials.token
      )

      # Make request
      api_url = "https://abc123.execute-api.us-east-1.amazonaws.com/v1"
      response = requests.get(
          f"{api_url}/?action=get_schedule_day&date=20260110",
          auth=auth
      )

      return {
          'statusCode': 200,
          'body': response.text
      }
