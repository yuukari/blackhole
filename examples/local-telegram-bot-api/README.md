# Deploying local Telegram bot API for downloading large files

The problem with official, cloud-side Telegram API, is that the `getFile` method only allows downloading files up to 20
megabytes; otherwise, the API returns an error. Switching to a local API avoids this issue.

This folder contains docker compose file for deploying unofficial instance of Telegram bot API server
from [gramiojs](https://github.com/gramiojs/telegram-bot-api) with caddy for serving files.

## Configuration and deployment

1. Copy .env.example to actual .env file:
    ```sh 
    cp .env.example .env
   ```
2. Set `TELEGRAM_BOT_API_UID` to actual user ID on the host system. You can get this ID by executing:
    ```sh
    id -u
    ```
3. Log in to https://my.telegram.org/apps and create a new app. After creation, in app configuration section
   find `api_id` and `api_hash` parameters, and fill `TELEGRAM_BOT_API_ID` and `TELEGRAM_BOT_API_HASH` environment
   variables
4. Run containers with docker composer:
   ```sh
   docker compose up -d
   ```
5. Configure environment variables for blackhole to use local Telegram bot API server. Add these values:
   ```dotenv
   BLACKHOLE_TELEGRAM_BOT_ALTERNATE_API=true
   BLACKHOLE_TELEGRAM_BOT_ALTERNATE_API_URL=http://127.0.0.1:38081
   BLACKHOLE_TELEGRAM_BOT_ALTERNATE_STORAGE_URL=http://127.0.0.1:38080
   ```
6. Before running blackhole, you need to call `logOut` method for your Telegram bot to ensure that original cloud-side
   API don't send any updates to it. You can do this by sending request via curl:
   ```sh
   curl \
     --fail-with-body \
     --silent \
     --show-error \
     --request POST \
     "https://api.telegram.org/bot${BLACKHOLE_TELEGRAM_BOT_TOKEN}/logOut"
   ```
   Excepted response is something like:
   ```json
   {"ok":true,"result":true}
   ```
7. Ensure that your local API works correctly:
   ```sh
   curl \
     --silent \
     --show-error \
     "http://127.0.0.1:38081/bot${BLACKHOLE_TELEGRAM_BOT_TOKEN}/getMe"
   ```
   Excepted response is something like:
   ```json
   {"ok":true,"result":{...}}
   ```
8. Run blackhole, and test that Telegram bot is working via local API.

## Rollback to original cloud-side Telegram bot API

1. Call `logOut` method for your Telegram bot on the local API:
   ```sh
   curl \
     --fail-with-body \
     --silent \
     --show-error \
     --request POST \
     "http://127.0.0.1:38081/bot${BLACKHOLE_TELEGRAM_BOT_TOKEN}/logOut"
   ```
2. Remove following values from blackhole environment variables:
   ```dotenv
   BLACKHOLE_TELEGRAM_BOT_ALTERNATE_API=true
   BLACKHOLE_TELEGRAM_BOT_ALTERNATE_API_URL=http://127.0.0.1:38081
   BLACKHOLE_TELEGRAM_BOT_ALTERNATE_STORAGE_URL=http://127.0.0.1:38080
   ```
   or just set `BLACKHOLE_TELEGRAM_BOT_ALTERNATE_API` to `false`
3. Wait minimum 10 minutes before running blackhole again. This is necessary because cloud-side API limits the bot's
   authorization during the first 10 minutes, and you will most likely receive an error:
   ```
   can't log in back to the cloud Bot API server for 10 minutes
   ```
4. Run blackhole, and test that Telegram bot is working via cloud-side API
