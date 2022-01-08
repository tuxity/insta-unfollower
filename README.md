Insta Unfollower
===================
An Instagram script, allowing you to automatically unfollow accounts you are following but that doesn't follow you back. Without using the Instagram API.

## Installation
- With Docker

Clone repository, cd into directory then run:
```
docker build -t tuxity/insta-unfollower .
docker run -d -v $(pwd)/cache:/usr/src/insta-unfollower/cache --env INSTA_USERNAME=myusername --env INSTA_PASSWORD=mypassword tuxity/insta-unfollower
```

- Without Docker
```
INSTA_USERNAME=myusername INSTA_PASSWORD=mypassword python3 insta-unfollower.py
```
Or
```
python3 insta-unfollower.py USERNAME PASSWORD
```

## Roadmap
- Username whitelist.
- Better flow for calculating time between requests to avoid ban.
- ~~Avoid re-log on instagram everytime when we run the script~~ done
- ~~Keep followers and following lists in cache to speedup execution~~ done
