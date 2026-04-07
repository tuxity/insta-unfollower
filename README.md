Insta Unfollower
===================

Personal Chrome extension: on **instagram.com**, uses the **logged-in account** in the active tab only. It shows follower/following **counts** (refreshable), then **Load Unfollowers** scans following/followers and caches only people who don’t follow you back. **Unfollow non-followers** uses that cache. No password is stored in the extension.

## Install (load unpacked)

1. Open Chrome → **Extensions** at `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select **this repository folder** (the one that contains `manifest.json`).

## Use

1. Open **https://www.instagram.com/** and sign in.
2. Keep that tab **active**, click the extension icon.
3. The popup shows **counts** for the logged-in user (or fetches them if this tab has no cached profile). If you are not signed in, you’ll get an error.
4. **Load Unfollowers** — loads following and followers, computes who doesn’t follow back, stores them in this tab’s cache, and shows the count in the popup. **Refresh counts** clears that cache and reloads profile counts from Instagram.
5. **Unfollow non-followers** — runs only after a successful Load Unfollowers.

**Stop current job** asks the Instagram tab to cancel: waits between pages and long delays end within about a second. An HTTP request that has already started may still complete.

State (counts, unfollowers cache) lives in that tab’s `sessionStorage`. The popup stops updating the log after about one hour; long jobs may still run in the tab.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (Manifest V3). |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup UI. |
| `page_runner.js` | Injected into the Instagram page; API calls and delays. |

## Roadmap

- Username whitelist.
- Friendlier progress for very long lists.
