import * as path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

import type { Bot } from 'grammy'
import type { Logger } from 'pino'

import type { TelegramBotConfig } from '../config/types.js'

import type { Provider, ProviderAlbum, ProviderTrack } from './types.js'

import { TelegramBotQueueRepository } from '../database/repository/index.js'
import type { TelegramBotQueueModel } from '../database/models/index.js'

import { runWithConcurrency, type Task } from '../utils/promises/index.js'

export class TelegramBotProvider implements Provider {
    private readonly config: TelegramBotConfig
    private readonly mediaPath: string

    private readonly bot: Bot
    private readonly telegramBotQueueRepository: TelegramBotQueueRepository

    private readonly logger: Logger

    public constructor(
        config: TelegramBotConfig, mediaPath: string,
        bot: Bot, telegramBotQueueRepository: TelegramBotQueueRepository,
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
            recursive: true
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

        const file = await this.bot.api.getFile(id)
        if (file.file_path === undefined) {
            throw new Error('Telegram API did not return file_path')
        }

        const track = this.telegramBotQueueRepository.getTrackById(id)
        if (track === undefined) {
            throw new Error(`Track not found in queue, id: ${id}`)
        }

        let filename =  path.join(this.mediaPath, this.config.directoryName, track.file_name)
        const response = await fetch(
            `https://api.telegram.org/file/bot${this.config.token}/${file.file_path}`,
        )
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status}`)
        }
        await writeFile(filename, Buffer.from(await response.arrayBuffer()))

        this.logger.debug(`Completed downloading track with id: ${id}`)
        return id
    }
}