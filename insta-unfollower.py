#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import random
import requests
import json
import re

instagram_url = 'https://www.instagram.com'
login_route = '%s/accounts/login/ajax/' % (instagram_url)
logout_route = '%s/accounts/logout/' % (instagram_url)
profile_route = '%s/%s/'
query_route = '%s/graphql/query/' % (instagram_url)
unfollow_route = '%s/web/friendships/%s/unfollow/'

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

    reponse = session.get(instagram_url)
    session.headers.update({
        'X-CSRFToken': reponse.cookies['csrftoken']
    })

    time.sleep(random.randint(2, 6))

    post_data = {
        'username': os.environ.get('USERNAME'),
        'password': os.environ.get('PASSWORD')
    }

    response = session.post(login_route, data=post_data, allow_redirects=True)
    response_data = json.loads(response.text)

    if response_data['authenticated']:
        session.headers.update({
            'X-CSRFToken': response.cookies['csrftoken']
        })

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
        'X-CSRFToken': response.cookies['csrftoken']
    })

    response = session.post(unfollow_route % (instagram_url, user['id']))
    response = json.loads(response.text)

    if response['status'] != 'ok':
        print('ERROR: {}'.format(unfollow.text))
        sys.exit('might be unfollowing too fast, quit to prevent ban...')


def logout():
    post_data = {
        'csrfmiddlewaretoken': session.cookies['csrftoken']
    }

    logout = session.post(logout_route, data=post_data)

    if logout.status_code == 200:
        return True
    return False


def main():
    if not os.environ.get('USERNAME') or not os.environ.get('PASSWORD'):
        sys.exit('please provide USERNAME and PASSWORD environement variables. Abording...')

    is_logged = login()
    if is_logged == False:
        sys.exit('login failed, verify user/password combination')

    time.sleep(random.randint(2, 4))

    connected_user = get_user_profile(os.environ.get('USERNAME'))
    print('You\'re now logged as {} ({} followers, {} following)'.format(connected_user['username'], connected_user['edge_followed_by']['count'], connected_user['edge_follow']['count']))

    time.sleep(random.randint(2, 4))

    print('building followers list...', end='', flush=True)
    followers_list = get_followers_list()
    print(' done')

    print('building following list...', end='', flush=True)
    following_list = get_following_list()
    print(' done')

    unfollow_users_list = [user for user in following_list if user not in followers_list]
    print('you are following {} user(s) who aren\'t following you.'.format(len(unfollow_users_list)))

    if len(unfollow_users_list) > 0:
        print('Begin to unfollow users...')

        for user in unfollow_users_list:
            if not os.environ.get('UNFOLLOW_VERIFIED') and user['is_verified'] == True:
                continue

            time.sleep(random.randint(2, 4))

            print('unfollowing {}'.format(user['username']))
            
            sucess = False
            while sucess == False:
                try:
                    unfollow(user)
                    sucess = True
                except:
                    unfollow(user)
                    sucess = False
                

    is_logged_out = logout()
    if is_logged_out:
        sys.exit(0)


if __name__ == "__main__":
    main()
