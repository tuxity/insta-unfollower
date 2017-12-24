Insta Unfollower
===================

[![](https://images.microbadger.com/badges/version/tuxity/insta-unfollower.svg)](https://hub.docker.com/r/tuxity/insta-unfollower/)
![](https://images.microbadger.com/badges/image/tuxity/insta-unfollower.svg)

An Instagram script to unfollow accounts you are following and that doesn't follow you back. Without using Instagram API !

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
- username whitelist
- better flow for calculating time between requests to avoid ban
