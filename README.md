# This app is the admin app for the Collaborative calendar

## Cloudflare
The UI is hosted directly in GitHub.  Any updates to the UI that update the repo will get reflected on the website.  The back end, to which the UI posts calendar requests is running on a different machine. 
A reverse proxy is configured to allow traffic to the website given a URL.  Cloudflare is used for that reverse proxy.

Whenever the docker restarts, there is a new forwarding URL.  This URL needs to be added to the config file for this project.  Run the command below to get the URL, and put it into the 
`docs/js/config.js`

### Cloudflare Quickstart
```
  # Watch the cloudflared logs to get your generated URL
  docker-compose logs -f cloudflared

```

### Restarting 
```
# cd to the project
cd /Users/gman/Projects/Python/95calendar

# Do a git pull

# Bring down the service
docker-compose down

# building
docker-compose up -d --build

# Starting
docker-compose up -d

# Tailing logs
docker-compose logs -f
```
