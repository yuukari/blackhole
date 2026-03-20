import * as path from 'node:path'
import { setTimeout } from 'timers/promises'

import type { Logger } from 'pino'

import type { YandexMusicConfig } from '../config/types.js'

import type { Track } from '../client/yandexMusic/types/tracks.js'
import type { Album } from '../client/yandexMusic/types/albums.js'
import { YandexMusicClient } from '../client/yandexMusic/index.js'

import type { Provider, ProviderAlbum, ProviderTrack } from './types.js'
import { runWithConcurrency, type Task } from '../utils/promises/index.js'
import { runProcessWithOutput } from '../utils/process/index.js'

export class YandexMusicProvider implements Provider {
    private readonly config: YandexMusicConfig
    private readonly mediaPath: string
    private readonly logger: Logger
    private readonly client: YandexMusicClient

    private userId: number | undefined

    public constructor(config: YandexMusicConfig, mediaPath: string, logger: Logger) {
        this.config = config
        this.mediaPath = mediaPath
        this.logger = logger.child({}, {msgPrefix: 'YandexMusicProvider - '})

        this.client = new YandexMusicClient(this.config.apiBaseUrl, this.config.token, {
            'Accept-Language': 'en',
        })
    }

    public getCode(): string {
        return 'yandexMusic'
    }

    public async init() {
        this.logger.debug(`Initiating client with API base url ${this.config.apiBaseUrl}`)

        const {uid} = await this.client.getAccountSettings()
        this.userId = uid

        this.logger.debug(`Client initiated and connected to user with ID ${this.userId}`)
    }

    public async* getTracksIds(chunkSize: number): AsyncGenerator<string[]> {
        this.checkClientInit()

        const {library: {tracks}} = await this.client.getLikedTracks(this.userId!)
        const syncFromDate = this.config.syncFromDate

        for (let i = 0; i < tracks.length; i += chunkSize) {
            await setTimeout(this.config.scanDelay)

            let tracksChunk = tracks.slice(i, i + chunkSize)
            if (syncFromDate != undefined) {
                tracksChunk = tracksChunk.filter(track => new Date(track.timestamp) >= syncFromDate)
            }

            yield tracksChunk.map(track => track.id)
        }
    }

    public async getTracksInfo(ids: string[]): Promise<ProviderTrack[]> {
        this.checkClientInit()

        const tracks = await this.client.getTracksInfo(ids)
        return this.mapTracksInfo(tracks)
    }

    public async downloadTracks(ids: string[]) {
        this.checkClientInit()
        return await this.downloadBatch('track', ids)
    }

    public async* getAlbumsIds(chunkSize: number): AsyncGenerator<string[]> {
        this.checkClientInit()

        const syncFromDate = this.config.syncFromDate

        let page = 0
        for (; ;) {
            await setTimeout(this.config.scanDelay)

            const {result: {albums, pager}} = await this.client.getLikedAlbums(this.userId!, page, chunkSize)

            let albumsChunk = albums
            if (syncFromDate != undefined) {
                albumsChunk = albums.filter(album => new Date(album.timestamp) >= syncFromDate)
            }

            yield albumsChunk.map(album => album.id.toString())

            page++
            if (page * chunkSize > pager.total) {
                break
            }
        }
    }

    public async getAlbumsInfo(ids: string[]): Promise<ProviderAlbum[]> {
        const albums = await this.client.getAlbumsInfo(ids)
        return this.mapAlbumsInfo(albums)
    }

    public async downloadAlbums(ids: string[]): Promise<string[]> {
        this.checkClientInit()
        return await this.downloadBatch('album', ids)
    }

    private mapTracksInfo(tracks: Track[]): ProviderTrack[] {
        return tracks.map((track) => {
            return {
                id: track.id,
                title: track.title,
                artists: track.artists.map(artist => artist.name),
            }
        })
    }

    private mapAlbumsInfo(albums: Album[]): ProviderAlbum[] {
        return albums.map((album) => {
            return {
                id: album.id.toString(),
                title: album.title,
                artists: album.artists.map(artist => artist.name),
            }
        })
    }

    private async downloadBatch(type: 'track' | 'album', ids: string[]): Promise<string[]> {
        this.logger.debug(ids, `Preparing to downloads batch of ${type}s`)

        const downloadedIds: string[] = []
        const tasks: Task<string>[] = ids.map((id) => {
            return async () => { return await this.download(type, id) }
        })
        const taskResults = await runWithConcurrency<string>(tasks, this.config.maxActiveDownloads)

        for (const taskResult of taskResults) {
            if (taskResult.status == 'fulfilled') {
                downloadedIds.push(taskResult.value)
                continue
            }
            this.logger.error(taskResult.error, `Failed to download ${type}`)
        }

        return downloadedIds
    }

    private async download(type: 'track' | 'album', id: string): Promise<string> {
        this.logger.debug(`Downloading ${type} with id: ${id}`)

        const {code, stderr} = await runProcessWithOutput('yandex-music-downloader', [
            '--token', this.config.token,
            `--${type}-id`, id,
            '--dir', path.join(this.mediaPath, this.config.directoryName),
            ...this.config.downloaderArgs,
        ])
        if (code != 0) {
            throw new Error(`yandex-music-downloader exited with code ${code}: ${stderr}`)
        }

        this.logger.debug(`Completed downloading ${type} with id: ${id}`)
        return id
    }

    private checkClientInit() {
        if (this.userId == undefined) {
            throw new Error('Client not initialized')
        }
    }
}