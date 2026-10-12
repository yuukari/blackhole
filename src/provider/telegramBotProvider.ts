import * as path from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, writeFile, rename, rm } from 'node:fs/promises'

import type { Bot } from 'grammy'
import type { File } from 'grammy/types'
import { applyTagsToFile, readTags, clearTags, applyPictures, type TagInput } from 'taglib-wasm/simple'
import type { Logger } from 'pino'

import type { Provider, ProviderAlbum, ProviderTrack } from './types.js'

import type { TelegramBotConfig } from '../config/types.js'
import type { TelegramBotContext } from '../bot/index.js'
import { TelegramBotQueueRepository } from '../database/repository/index.js'
import type { TelegramBotQueueModel } from '../database/models/index.js'

import { runWithConcurrency, type Task } from '../utils/promises/index.js'
import { sanitizePath } from '../utils/files/index.js'

export class TelegramBotProvider implements Provider {
    private readonly config: TelegramBotConfig
    private readonly mediaPath: string

    private readonly bot: Bot<TelegramBotContext>
    private readonly telegramBotQueueRepository: TelegramBotQueueRepository

    private readonly logger: Logger

    public constructor(
        config: TelegramBotConfig, mediaPath: string,
        bot: Bot<TelegramBotContext>, telegramBotQueueRepository: TelegramBotQueueRepository,
        logger: Logger,
    ) {
        this.config = config
        this.mediaPath = mediaPath

        this.bot = bot
        this.telegramBotQueueRepository = telegramBotQueueRepository

        this.logger = logger.child({}, {msgPrefix: 'TelegramBotProvider - '})
    }

    public getCode(): string {
        return 'telegramBot'
    }

    public async init() {
        if (!this.config.enabled) {
            throw new Error('Usage of telegram bot provider with disabled telegram bot flag')
        }

        await mkdir(path.join(this.mediaPath, this.config.directoryName), {
            recursive: true,
        })

        const {username} = await this.bot.api.getMe()
        this.logger.debug(`Using telegram bot @${username} (https://t.me/${username})`)
    }

    public async* getTracksIds(chunkSize: number): AsyncGenerator<string[]> {
        const syncFromDate = this.config.syncFromDate

        for (; ;) {
            let tracks = this.telegramBotQueueRepository.getPendingTracks(chunkSize, 0)
            if (tracks.length === 0) {
                break
            }
            if (syncFromDate != undefined) {
                tracks = tracks.filter(track => new Date(track.added_at) >= syncFromDate)
            }

            const ids = tracks.map(track => track.id)
            this.telegramBotQueueRepository.setStatus('processed', tracks.map(track => track.id))
            yield ids
        }
    }

    public async getTracksInfo(ids: string[]): Promise<ProviderTrack[]> {
        const tracks = this.telegramBotQueueRepository.getTracksByIds(ids)
        return this.mapTracksInfo(tracks)
    }

    public async downloadTracks(ids: string[]): Promise<string[]> {
        return await this.downloadBatch(ids)
    }

    public async* getAlbumsIds(chunkSize: number): AsyncGenerator<string[]> {
        return []
    }

    public async getAlbumsInfo(ids: string[]): Promise<ProviderAlbum[]> {
        throw new Error('Albums downloading is not supported')
    }

    public async downloadAlbums(ids: string[]): Promise<string[]> {
        throw new Error('Albums downloading is not supported')
    }

    private mapTracksInfo(tracks: TelegramBotQueueModel[]): ProviderTrack[] {
        return tracks.map((track) => {
            return {
                id: track.id,
                title: track.title ?? 'Unknown title',
                artists: track.artists ? track.artists.split(', ') : ['Unknown artist'],
            }
        })
    }

    private async downloadBatch(ids: string[]): Promise<string[]> {
        this.logger.debug(ids, `Preparing to downloads batch of tracks`)

        const downloadedIds: string[] = []
        const tasks: Task<string>[] = ids.map((id) => {
            return async () => { return await this.download(id) }
        })
        const taskResults = await runWithConcurrency<string>(tasks, this.config.maxActiveDownloads)

        for (const taskResult of taskResults) {
            if (taskResult.status == 'fulfilled') {
                downloadedIds.push(taskResult.value)
                continue
            }
            this.logger.error(taskResult.error, `Failed to download track`)
        }

        return downloadedIds
    }

    private async download(id: string): Promise<string> {
        this.logger.debug(`Downloading track with id: ${id}`)

        const track = this.telegramBotQueueRepository.getTrackById(id)
        if (track === undefined) {
            throw new Error(`Track not found in queue, id: ${id}`)
        }

        const file = await this.bot.api.getFile(id)
        const response = await fetch(this.buildFileUrl(file))
        if (!response.ok) {
            throw new Error(`Failed to download file for track with id '${id}': ${response.status}`)
        }

        // Prepare paths for temporary file
        const tempFilename = path.join(this.mediaPath, '.temp', id)
        await mkdir(path.dirname(tempFilename), {recursive: true})

        // Download content to temporary file and normalize tags
        await writeFile(tempFilename, Buffer.from(await response.arrayBuffer()))
        try {
            await this.normalizeTags(track, tempFilename)
            const filename = await this.buildFilename(track, tempFilename)
            if (existsSync(filename)) {
                this.logger.debug(`Track with id '${id}' already downloaded, file '${filename}' exists`)
                return id
            }

            // Move file to actual media library
            await mkdir(path.dirname(filename), {recursive: true})
            await rename(tempFilename, filename)
        } finally {
            await rm(tempFilename, { force: true })
        }

        this.logger.debug(`Completed downloading track with id: ${id}`)
        return id
    }

    private buildFileUrl(file: File): string {
        if (file.file_path === undefined) {
            throw new Error('Telegram API did not return file_path')
        }

        if (!this.config.alternateApi) {
            return `https://api.telegram.org/file/bot${this.config.token}/${file.file_path}`
        }

        const tokenIndex = file.file_path.indexOf(this.config.token)
        if (tokenIndex < 0) {
            throw new Error(`Unable to determine relative file path for '${file.file_path}'`)
        }

        const relativePath = file.file_path.slice(tokenIndex)
        return `${this.config.alternateStorageUrl}/${relativePath.split('/').map(encodeURIComponent).join('/')}`
    }

    private async buildFilename(track: TelegramBotQueueModel, tempFilename: string): Promise<string> {
        const tags = await readTags(tempFilename)

        const artists = track.artists ? track.artists.split(', ') : []
        const artist = sanitizePath(artists[0] ?? 'Unknown artist')
        const album = sanitizePath(tags.album?.[0] ?? 'Unknown album')
        const trackNumber = tags.track ? `${tags.track}. ` : ''

        const directory = path.join(this.mediaPath, this.config.directoryName, artist, album)
        if (!track.artists || !track.title) {
            return path.join(directory, sanitizePath(track.file_name))
        }

        const extension = path.extname(track.file_name)
        const filename = `${sanitizePath(`${trackNumber}${track.artists} - ${track.title}`)}${extension}`
        return path.join(directory, filename)
    }

    private async normalizeTags(track: TelegramBotQueueModel, filename: string) {
        const tags = await readTags(filename)
        const pictures = tags.pictures
        const newTags: Partial<TagInput> = {}

        const addTag = <K extends keyof TagInput>(
            key: K,
            value: TagInput[K] | undefined,
        ): void => {
            if (value === undefined || value === 0) {
                return
            }
            if (Array.isArray(value) && value.length === 0) {
                return
            }
            Object.assign(newTags, {
                [key]: value,
            })
        }

        addTag('title', track.title)
        if (track.artists) {
            const artists = track.artists.split(', ')
            addTag('artist', artists.join('; '))
            addTag('albumArtist', artists[0])
        }
        addTag('album', tags.album)
        addTag('track', tags.track)
        addTag('totalTracks', tags.totalTracks)
        addTag('year', tags.year)
        addTag('genre', tags.genre?.join('; '))

        await clearTags(filename)
        await applyTagsToFile(filename, newTags)
        if (pictures) {
            await applyPictures(filename, pictures)
        }
    }
}