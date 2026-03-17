import { existsSync } from 'node:fs'

import * as dotenv from 'dotenv'

import type { Config, SyncRules } from './types.js'

export function loadConfig(): Config {
    if (existsSync('.env')) {
        dotenv.config({
            path: '.env',
            quiet: true,
        })
    }
    validateConfig()

    return {
        debugMode: isDebugMode(),
        databasePath: process.env.BLACKHOLE_DATABASE_PATH ?? '/opt/blackhole/database.sqlite',
        mediaPath: process.env.BLACKHOLE_MEDIA_PATH ?? '/opt/blackhole/media',
        processChunkSize: process.env.BLACKHOLE_PROCESS_CHUNK_SIZE
            ? parseInt(process.env.BLACKHOLE_PROCESS_CHUNK_SIZE)
            : 10,
        syncSchedule: process.env.BLACKHOLE_SYNC_SCHEDULE ?? '*/15 * * * *',
        syncOnStart: process.env.BLACKHOLE_SYNC_ON_START
            ? process.env.BLACKHOLE_SYNC_ON_START.toLowerCase() === 'true'
            : false,

        syncRules: process.env.BLACKHOLE_SYNC_RULES
            ? JSON.parse(process.env.BLACKHOLE_SYNC_RULES) as Record<string, SyncRules>
            : {},
        yandexMusic: {
            apiBaseUrl: process.env.BLACKHOLE_YANDEX_MUSIC_API_BASE_URL ?? 'https://api.music.yandex.net',
            token: process.env.BLACKHOLE_YANDEX_MUSIC_TOKEN!,
            scanDelay: process.env.BLACKHOLE_YANDEX_MUSIC_SCAN_DELAY
                ? parseInt(process.env.BLACKHOLE_YANDEX_MUSIC_SCAN_DELAY)
                : 100,
            directoryName: process.env.BLACKHOLE_YANDEX_MUSIC_DIRECTORY_NAME ?? 'yandex-music',
            syncFromDate: process.env.BLACKHOLE_YANDEX_MUSIC_SYNC_FROM_DATE
                ? new Date(process.env.BLACKHOLE_YANDEX_MUSIC_SYNC_FROM_DATE)
                : undefined,
            downloaderArgs: process.env.BLACKHOLE_YANDEX_MUSIC_DOWNLOADER_ARGS
                ? process.env.BLACKHOLE_YANDEX_MUSIC_DOWNLOADER_ARGS.split(',')
                : [
                    '--quality', '2',
                    '--skip-existing',
                ],
            maxActiveDownloads: process.env.BLACKHOLE_YANDEX_MUSIC_MAX_ACTIVE_DOWNLOADS
                ? parseInt(process.env.BLACKHOLE_YANDEX_MUSIC_MAX_ACTIVE_DOWNLOADS)
                : 2,
        },
    }
}

export function isDebugMode(): boolean {
    return process.env.BLACKHOLE_DEBUG_MODE
        ? process.env.BLACKHOLE_DEBUG_MODE.toLowerCase() === 'true'
        : false
}

function validateConfig() {
    const {
        BLACKHOLE_YANDEX_MUSIC_TOKEN,
        BLACKHOLE_YANDEX_MUSIC_SYNC_FROM_DATETIME,
        BLACKHOLE_SYNC_RULES,
        BLACKHOLE_YANDEX_MUSIC_MAX_ACTIVE_DOWNLOADS,
    } = process.env

    if (BLACKHOLE_YANDEX_MUSIC_TOKEN == undefined) {
        throw new Error('BLACKHOLE_YANDEX_MUSIC_TOKEN environment variable not set')
    }

    if (
        BLACKHOLE_YANDEX_MUSIC_SYNC_FROM_DATETIME != undefined &&
        isNaN((new Date(BLACKHOLE_YANDEX_MUSIC_SYNC_FROM_DATETIME)).getTime())
    ) {
        throw new Error('Failed to parse datetime from BLACKHOLE_YANDEX_MUSIC_SYNC_FROM_DATETIME environment variable')
    }

    if (BLACKHOLE_SYNC_RULES != undefined) {
        try {
            JSON.parse(BLACKHOLE_SYNC_RULES)
        } catch (e: unknown) {
            throw new Error('Failed to parse sync rules from BLACKHOLE_SYNC_RULES environment variable', {
                cause: e,
            })
        }
    }

    if (
        BLACKHOLE_YANDEX_MUSIC_MAX_ACTIVE_DOWNLOADS != undefined &&
        parseInt(BLACKHOLE_YANDEX_MUSIC_MAX_ACTIVE_DOWNLOADS) < 1
    ) {
        throw new Error('BLACKHOLE_YANDEX_MUSIC_MAX_ACTIVE_DOWNLOADS environment variable must be set as positive integer')
    }
}