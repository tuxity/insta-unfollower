#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os
import time
import random
import requests
import json

instagram_url = 'https://www.instagram.com'
login_route = '%s/accounts/login/ajax/' % (instagram_url)
logout_route = '%s/accounts/logout/' % (instagram_url)

session = requests.Session()

def login():
    session.headers.update({
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.8',
        'Connection': 'keep-alive',
        'Content-Length': '0',
        'Host': 'www.instagram.com',
        'Origin': 'https://www.instagram.com',
        'Referer': 'https://www.instagram.com/',
        'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 \
            (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36'),
        'X-Instagram-AJAX': '1',
        'X-Requested-With': 'XMLHttpRequest'
    })
    session.cookies.update({
        'ig_pr': '1',
        'ig_vw': '1920',
    })

    r = session.get(instagram_url)
    session.headers.update({
        'X-CSRFToken': r.cookies['csrftoken']
    })

    time.sleep(5 * random.random())

    post_data = {
        'username': os.environ.get('USERNAME'),
        'password': os.environ.get('PASSWORD')
    }

    login = session.post(login_route, data=post_data, allow_redirects=True)
    login_r = json.loads(login.text)

    if login_r['authenticated'] == True:
        print ('successfully logged in!')

        session.headers.update({
            'X-CSRFToken': login.cookies['csrftoken']
        })
    else:
        if login_r['user'] == True:
            print ('login failed, wrong password')
        else:
            print ('login failed, verify user/password combination')
        quit()


def logout():
    post_data = {
        'csrfmiddlewaretoken': session.cookies['csrftoken']
    }

    logout = session.post(logout_route, data=post_data)
    if logout.status_code == 200:
        print ('successfully logged out')


def main():
    if not os.environ.get('USERNAME') or not os.environ.get('PASSWORD'):
        print ('Please provide USERNAME and PASSWORD environement variables.')
        print ('Abording...')
        quit()

    login()
    #unfollow flow
    logout()


if __name__ == "__main__":
    main()
