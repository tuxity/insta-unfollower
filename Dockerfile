FROM python:3.10-alpine
LABEL maintainer="Kévin Darcel <tuxity@users.noreply.github.com>"

WORKDIR /usr/src/insta-unfollower

COPY insta-unfollower.py requirements.txt /usr/src/insta-unfollower/

RUN pip install --no-cache-dir -r requirements.txt

ENTRYPOINT ["python", "-u", "insta-unfollower.py"]
