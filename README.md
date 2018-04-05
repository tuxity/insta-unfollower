Insta Unfollower
===================

[![](https://images.microbadger.com/badges/version/tuxity/insta-unfollower.svg)](https://hub.docker.com/r/tuxity/insta-unfollower/)
![](https://images.microbadger.com/badges/image/tuxity/insta-unfollower.svg)

An Instagram script, allowing you to automatically unfollow accounts you are following but that doesn't follow you back. Without using the Instagram API.

## Installation
### With Docker
```
docker pull tuxity/insta-unfollower:latest
docker run -d --env USERNAME=myusername --env PASSWORD=mypassword tuxity/insta-unfollower:latest
```

### Without Docker
```
USERNAME=myusername PASSWORD=mypassword python3 insta-unfollower.py
```

## Roadmap
- Username whitelist.
- Better flow for calculating time between requests to avoid ban.
