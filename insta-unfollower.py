#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import random
import requests, pickle
import json
import re
from datetime import datetime

cache_dir = 'cache'
session_cache = '%s/session.txt' % (cache_dir)
followers_cache = '%s/followers.json' % (cache_dir)
following_cache = '%s/following.json' % (cache_dir)

instagram_url = 'https://www.instagram.com'
login_route = '%s/accounts/login/ajax/' % (instagram_url)
profile_route = '%s/%s/'
query_route = '%s/graphql/query/' % (instagram_url)
unfollow_route = '%s/web/friendships/%s/unfollow/'

session = requests.Session()


class Credentials:
    def __init__(self):
        if os.environ.get('INSTA_USERNAME') and os.environ.get('INSTA_PASSWORD'):
            self.username = os.environ.get('INSTA_USERNAME')
            self.password = os.environ.get('INSTA_PASSWORD')
        elif len(sys.argv) > 1:
            self.username = sys.argv[1]
            self.password = sys.argv[2]
        else:
            sys.exit('Please provide INSTA_USERNAME and INSTA_PASSWORD environement variables or as an argument as such: ./insta-unfollower.py USERNAME PASSWORD.\nAborting...')

credentials = Credentials()
def login():
    session.headers.update({
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.8',
        'Connection': 'keep-alive',
        'Content-Length': '0',
        'Host': 'www.instagram.com',
        'Origin': 'https://www.instagram.com',
        'Referer': 'https://www.instagram.com/',
        'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
            (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36'),
        'X-Instagram-AJAX': '7a3a3e64fa87',
        'X-Requested-With': 'XMLHttpRequest'
    })

    reponse = session.get(instagram_url)

    csrf = re.findall(r"csrf_token\":\"(.*?)\"", reponse.text)[0]
    if csrf:
        session.headers.update({
            'x-csrftoken': csrf
        })
    else:
        print("No csrf token found in cookies, maybe you are temp ban? Wait 1 hour and retry")
        return False

    time.sleep(random.randint(2, 6))

    post_data = {
        'username': credentials.username,
        'enc_password': '#PWD_INSTAGRAM_BROWSER:0:{}:{}'.format(int(datetime.now().timestamp()), credentials.password)
    }

    response = session.post(login_route, data=post_data, allow_redirects=True)
    response_data = json.loads(response.text)

    if 'two_factor_required' in response_data:
        print('Please disable 2-factor authentication to login.')
        sys.exit(1)

    if 'message' in response_data and response_data['message'] == 'checkpoint_required':
        print('Please check Instagram app for a security confirmation that it is you trying to login.')
        sys.exit(1)

    return response_data['authenticated']


# Not so useful, it's just to simulate human actions better
def get_user_profile(username):
    response = session.get(profile_route % (instagram_url, username))
    extract = re.search(r'window._sharedData = (.+);</script>', str(response.text))
    response = json.loads(extract.group(1))
    return response['entry_data']['ProfilePage'][0]['graphql']['user']


def get_followers_list():
    followers_list = []

    query_hash = '56066f031e6239f35a904ac20c9f37d9'
    variables = {
        "id":session.cookies['ds_user_id'],
        "include_reel":False,
        "fetch_mutual":False,
        "first":50
    }

    response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})
    while response.status_code != 200:
        time.sleep(600) # querying too much, sleeping a bit before querying again
        response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})

    print('.', end='', flush=True)

    response = json.loads(response.text)

    for edge in response['data']['user']['edge_followed_by']['edges']:
        followers_list.append(edge['node'])

    while response['data']['user']['edge_followed_by']['page_info']['has_next_page']:
        variables['after'] = response['data']['user']['edge_followed_by']['page_info']['end_cursor']

        time.sleep(2)

        response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})
        while response.status_code != 200:
            time.sleep(600) # querying too much, sleeping a bit before querying again
            response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})

        print('.', end='', flush=True)

        response = json.loads(response.text)

        for edge in response['data']['user']['edge_followed_by']['edges']:
            followers_list.append(edge['node'])

    return followers_list


def get_following_list():
    follows_list = []

    query_hash = 'c56ee0ae1f89cdbd1c89e2bc6b8f3d18'
    variables = {
        "id":session.cookies['ds_user_id'],
        "include_reel":False,
        "fetch_mutual":False,
        "first":50
    }

    response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})
    while response.status_code != 200:
        time.sleep(600) # querying too much, sleeping a bit before querying again
        response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})

    print('.', end='', flush=True)

    response = json.loads(response.text)

    for edge in response['data']['user']['edge_follow']['edges']:
        follows_list.append(edge['node'])

    while response['data']['user']['edge_follow']['page_info']['has_next_page']:
        variables['after'] = response['data']['user']['edge_follow']['page_info']['end_cursor']

        time.sleep(2)

        response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})
        while response.status_code != 200:
            time.sleep(600) # querying too much, sleeping a bit before querying again
            response = session.get(query_route, params={'query_hash': query_hash, 'variables': json.dumps(variables)})

        print('.', end='', flush=True)

        response = json.loads(response.text)

        for edge in response['data']['user']['edge_follow']['edges']:
            follows_list.append(edge['node'])

    return follows_list


def unfollow(user):
    response = session.get(profile_route % (instagram_url, user['username']))
    time.sleep(random.randint(2, 4))

    # update header again, idk why it changed
    session.headers.update({
        'x-csrftoken': response.cookies['csrftoken']
    })

    response = session.post(unfollow_route % (instagram_url, user['id']))
    response = json.loads(response.text)

    if response['status'] != 'ok':
        print('Error while trying to unfollow {}. Retrying in a bit...'.format(user['username']))
        print('ERROR: {}'.format(response.text))
        return False
    return True


def main():

    if not os.path.isdir(cache_dir):
        os.makedirs(cache_dir)

    if os.path.isfile(session_cache):
        with open(session_cache, 'rb') as f:
            session.cookies.update(pickle.load(f))
    else:
        is_logged = login()
        if is_logged == False:
            sys.exit('login failed, verify user/password combination')

        with open(session_cache, 'wb') as f:
            pickle.dump(session.cookies, f)

        time.sleep(random.randint(2, 4))

    connected_user = get_user_profile(credentials.username)

    print('You\'re now logged as {} ({} followers, {} following)'.format(connected_user['username'], connected_user['edge_followed_by']['count'], connected_user['edge_follow']['count']))

    time.sleep(random.randint(2, 4))

    following_list = []
    if os.path.isfile(following_cache):
        with open(following_cache, 'r') as f:
            following_list = json.load(f)
            print('following list loaded from cache file')

    if len(following_list) != connected_user['edge_follow']['count']:
        if len(following_list) > 0:
            print('rebuilding following list...', end='', flush=True)
        else:
            print('building following list...', end='', flush=True)
        following_list = get_following_list()
        print(' done')

        with open(following_cache, 'w') as f:
            json.dump(following_list, f)

    followers_list = []
    if os.path.isfile(followers_cache):
        with open(followers_cache, 'r') as f:
            followers_list = json.load(f)
            print('followers list loaded from cache file')

    if len(followers_list) != connected_user['edge_followed_by']['count']:
        if len(following_list) > 0:
            print('rebuilding followers list...', end='', flush=True)
        else:
            print('building followers list...', end='', flush=True)
        followers_list = get_followers_list()
        print(' done')

        with open(followers_cache, 'w') as f:
            json.dump(followers_list, f)

    followers_usernames = {user['username'] for user in followers_list}
    unfollow_users_list = [user for user in following_list if user['username'] not in followers_usernames]

    print('you are following {} user(s) who aren\'t following you:'.format(len(unfollow_users_list)))
    for user in unfollow_users_list:
        print(user['username'])

    if len(unfollow_users_list) > 0:
        print('Begin to unfollow users...')

        for user in unfollow_users_list:
            if not os.environ.get('UNFOLLOW_VERIFIED') and user['is_verified'] == True:
                print('Skipping {}...'.format(user['username']))
                continue

            time.sleep(random.randint(2, 4))

            print('Unfollowing {}...'.format(user['username']))
            while unfollow(user) == False:
                time.sleep(random.randint(1, 3) * 1000) # High number on purpose

        print(' done')


if __name__ == "__main__":
    main()
