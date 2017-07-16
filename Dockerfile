FROM python:3.6-alpine
MAINTAINER Kévin Darcel <kevin.darcel@gmail.com>

WORKDIR /usr/src/insta-unfollower

COPY insta-unfollower.py /usr/src/insta-unfollower/

ENTRYPOINT ["python", "-u", "insta-unfollower.py"]
