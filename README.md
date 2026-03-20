# blackhole

blackhole is a small util that syncing and sucking (downloading) your music from streaming services to local storage.
Intended to use on a NAS or homelab server.

## ✨ Features

- Automatic syncing and downloading your tracks and albums marked as "favourites"
  from [various streaming services](#-supported-streaming-services)
- Can be used for one-time synchronization
- Support various parameters for filtering tracks and albums that you want to save locally
- Docker-ready
- Minimal dependencies, one image. Uses SQLite database as storage for sync state

## 🎵 Supported streaming services

- [X] [Yandex Music](https://music.yandex.ru)
- [ ] [VK](https://music.vk.com/)
- [ ] [SoundCloud](https://soundcloud.com)
- [ ] [Spotify](https://spotify.com)
- [ ] [Tidal](https://tidal.com/)

> Currently, only Yandex Music is supported. Other services will be added some time later

## ⚡ Quick start

### Prerequisites

This project uses [task](https://taskfile.dev/) runner and [Taskfile.yaml](/Taskfile.yaml) to run quick actions such as
dockerized or local run, installing tools and dependencies for development, etc. So it is recommended
to [install it first](https://taskfile.dev/docs/installation).

However, you can use `docker compose` and `npm` to do the same things.

If you are planning to run blackhole locally on your host, you also need to install:

- python >= 3.11
- [uv package manager](https://github.com/astral-sh/uv)

### Get credentials

blackhole requires credentials (token or username and password) for authentication in your accounts on streaming
services to get and download your favourites tracks and albums. This process described
in [this section](#-getting-credentials-for-authentication-in-streaming-services).

Pick streaming service(s) that you want to sync, get credentials, then move to the next step.

### Setting environment variables

Create new empty `.env` file in project directory and fill it with minimal set of configuration.

For **run in Docker**, the minimal set is:

```dotenv
# Optional, but recommended to set for correct tasks scheduling
TZ=Europe/Moscow

# Replace <changeme> with your Yandex Music OAuth token
BLACKHOLE_YANDEX_MUSIC_TOKEN=<changeme>
```

Also, for Docker Compose you can pass this variables in `environment` section
in [docker-compose.yaml](docker-compose.yaml).

For **run locally on your host**, the minimal set is:

```dotenv
# Optional, but recommended to set for correct tasks scheduling
TZ=Europe/Moscow

# Set paths for database and media directory
BLACKHOLE_DATABASE_PATH=./storage/database.sqlite
BLACKHOLE_MEDIA_PATH=./storage/media

# Replace <changeme> with your Yandex Music OAuth token
BLACKHOLE_YANDEX_MUSIC_TOKEN=<changeme>
```

Full list of available environment variables described in [configuration section](#-configuration).

### Run with Docker

Run with task runner via Docker Compose:

```shell
task docker:run
```

Or, if you want to use `docker compose` command:

```shell
docker compose up -d
```

Or, if you want to run container in Docker without Docker Compose:

```shell
docker run --name blackhole \
  -e TZ=Europe/Moscow \
  -e BLACKHOLE_YANDEX_MUSIC_TOKEN=<changeme> \
  --user "$(id -u)" \
  -v "$PWD/storage:/opt/blackhole" \
  --restart unless-stopped \
  iamyuukari/blackhole
```

### Run locally on your host

First, create directories for database and media:

```shell
mkdir ./storage
mkdir ./storage/media
```

Run with task runner:

```shell
# Install dependencies
task init

# Build source and run util
task local:run
```

Or, run with task for one-time sync:

```shell
# Install dependencies
task init

# Build source and run util
task local:run-once
```

Or, using npm:

```shell
# Install yandex-music-downloader via uv tool
uv tool install git+https://github.com/llistochek/yandex-music-downloader

# Install dependencies and build source
npm i
npm build

# Run util
npm start-once
```

Or, using npm for one-time sync:

```shell
# Install yandex-music-downloader via uv tool
uv tool install git+https://github.com/llistochek/yandex-music-downloader

# Install dependencies and build source
npm i
npm build

# Run util for one-time sync
npm start-once
```

## 🔐 Getting credentials for authentication in streaming services

### Yandex Music

For syncing and downloading tracks from Yandex Music you need to obtain OAuth token. There is few options to do this:

1. Use browser extension:
    - [For Chromium-based browser](https://chrome.google.com/webstore/detail/yandex-music-token/lcbjeookjibfhjjopieifgjnhlegmkib)
    - [For Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/yandex-music-token/)
2. Use specialized APK for devices on
   Android: [MarshalX/yandex-music-token](https://github.com/MarshalX/yandex-music-token/releases)
3. Extract OAuth token from URL in browser
   following [this guide](https://github.com/MarshalX/yandex-music-api/discussions/513#discussioncomment-2729781)
4. Use [music-yandex-bot.ru](https://music-yandex-bot.ru/) website (may not work on some accounts)

## ⚙️ Configuration

All configuration options can be set through environment variables. **Required variables marked with 🔸 emoji**, all
other variables are optional.

### Common configuration

| Variable                     | Description                                                                                                                                                                                                                                               | Default value                  |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------|
| TZ                           | Your timezone. Optional, but recommended to set for correct tasks scheduling                                                                                                                                                                              |                                |
| BLACKHOLE_DEBUG_MODE         | If set to `true`, enables debug log level and pretty-printing for log messages                                                                                                                                                                            | false                          |
| BLACKHOLE_DATABASE_PATH      | Path for the SQLite database                                                                                                                                                                                                                              | /opt/blackhole/database.sqlite |
| BLACKHOLE_MEDIA_PATH         | Path for the media directory, where music will be downloaded                                                                                                                                                                                              | /opt/blackhole/media           |
| BLACKHOLE_PROCESS_CHUNK_SIZE | Specifies chunk size for requesting tracks and albums info from streaming services APIs (used as page size for pagination, if possible), and for getting, inserting or updating records in database.                                                      | 10                             |
| BLACKHOLE_SYNC_SCHEDULE      | CRON-like schedule string that configures when sync and download tasks will be run. Based on [node-schedule syntax](https://github.com/node-schedule/node-schedule?tab=readme-ov-file#cron-style-scheduling). Default schedule run tasks every 15 minutes | */15 * * * *                   |
| BLACKHOLE_SYNC_ON_START      | If set to `true`, blackhole will be run sync and download tasks right after start                                                                                                                                                                         | false                          |
| BLACKHOLE_SYNC_RULES         | Rules and filters for music providers. Must be valid JSON object. See [sync rules](#sync-rules) section for reference.                                                                                                                                    | {}                             |

### Yandex Music configuration

| Variable                                    | Description                                                                                                                                                                                                                                                                                                                                                                                           | Default value                |
|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| BLACKHOLE_YANDEX_MUSIC_API_BASE_URL         | Base url for Yandex Music API                                                                                                                                                                                                                                                                                                                                                                         | https://api.music.yandex.net |
| BLACKHOLE_YANDEX_MUSIC_TOKEN 🔸             | OAuth token for authorization                                                                                                                                                                                                                                                                                                                                                                         |                              |
| BLACKHOLE_YANDEX_MUSIC_SCAN_DELAY           | Delay (in milliseconds) between the requests when scanning favourites tracks and albums                                                                                                                                                                                                                                                                                                               | 100                          |
| BLACKHOLE_YANDEX_MUSIC_DIRECTORY_NAME       | Name for subdirectory in media directory. If BLACKHOLE_MEDIA_PATH set as default value, full path to downloaded tracks will be: `/opt/blackhole/media/yandex-music`                                                                                                                                                                                                                                   | yandex-music                 |
| BLACKHOLE_YANDEX_MUSIC_SYNC_FROM_DATE       | Date (or datetime) from which synchronization and downloading of tracks begins. Relies on dates when you added tracks or albums to your favorites. You can use any format that supported by JavaScript Date object, for example, `2025-06-20` or `2025-06-20T18:20:00`                                                                                                                                |                              |
| BLACKHOLE_YANDEX_MUSIC_DOWNLOADER_ARGS      | Arguments for [Yandex Music Downloader](https://github.com/llistochek/yandex-music-downloader) util, separated by comma. For reference see [this section](https://github.com/llistochek/yandex-music-downloader). Default set to download best quality and skip downloading for existing tracks. Also, blackhole always will be overwrite `--token`, `--track-id`/`--album-id` and `--dir` arguments. | --quality,2,--skip-existing  |
| BLACKHOLE_YANDEX_MUSIC_MAX_ACTIVE_DOWNLOADS | Max active concurrent downloads count (running processes of Yandex Music Downloader)                                                                                                                                                                                                                                                                                                                  | 2                            |

### Sync rules

Sync rules are various rules and filters for music providers. These rules are written as a JSON key-value object, where:

- **key** is provider code
- **value** is other key-value JSON object with the sync rules configured

Sync rules key-value object is **unified and supported by any provider**. All values are optional. Sync rules object
reference:

| Key            | Type     | Description                                                                                    | Default value |
|----------------|----------|------------------------------------------------------------------------------------------------|---------------|
| syncTracks     | boolean  | Enable sync and download for tracks                                                            | true          |
| syncAlbums     | boolean  | Enable sync and download for albums                                                            | true          |
| excludeTracks  | string[] | Exclude tracks by title. Track titles are case-insensitive and compared as a full string match | []            |
| excludeAlbums  | string[] | Exclude albums by title. Album titles are case-insensitive and compared as a full string match | []            |
| excludeArtists | string[] | Exclude artists by name. Artist names are case-insensitive and compared as a full string match | []            |

So, the configuration must be written like this:

```json5
{
  // sync rules for Yandex Music
  "yandexMusic": {
    // do not sync and download albums
    "syncAlbums": false,
    // exclude albums by searching this title
    "excludeAlbums": [
      "kAiCoRe"
    ],
    // exclude tracks and albums from this artists
    "excludeArtists": [
      "Beastboi",
      "Barely Alive",
      "Skrillex",
      "Virtual Riot"
    ]
  },
  "otherMusicProviderCode": {
    // other sync rules
  },
  "yetAnotherMusicProviderCode": {
    // other sync rules
  }
}
```

And passed in environment variable as minified JSON:

```dotenv
BLACKHOLE_SYNC_RULES='{"yandexMusic":{"syncAlbums":false,"excludeAlbums":["kAiCoRe"],"excludeArtists":["Beastboi","Barely Alive","Skrillex","Virtual Riot"]},"otherMusicProviderCode":{},"yetAnotherMusicProviderCode":{}}'
```

Available music provider codes:

- `yandexMusic` for Yandex Music

## 👏 Gratitude

Some tools and stuff from other people was used in this project. Many thanks to:

- [MarshalX](https://github.com/MarshalX) - for research and development many tools that works with Yandex Music
- [acherkashin](https://github.com/acherkashin) for
  creating [TypeScript client and Swagger for Yandex Music API](https://github.com/acherkashin/yandex-music-open-api)
- [llistochek](https://github.com/llistochek/yandex-music-downloader) - for
  creating [Yandex Music Downloader](https://github.com/llistochek/yandex-music-downloader)

## Disclaimer

This software is provided "AS IS", and provided for personal use. The developer does not promote or support illegal
music distribution, content piracy, etc., and not responsible for any potential risks or actions associated with the use
of this software.