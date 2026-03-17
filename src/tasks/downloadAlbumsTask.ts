import type { Logger } from 'pino'

import type { Task } from './types.js'
import type { Provider } from '../provider/index.js'
import { AlbumsRepository } from '../database/repository/index.js'
import type { SyncRules } from '../config/index.js'

export class DownloadAlbumsTask implements Task {
    private readonly providers: Provider[]
    private readonly albumsRepository: AlbumsRepository
    private readonly logger: Logger
    private readonly syncRules: Record<string, SyncRules>
    private readonly chunkSize: number

    public constructor(providers: Provider[], albumsRepository: AlbumsRepository, logger: Logger, syncRules: Record<string, SyncRules>, chunkSize: number) {
        this.providers = providers
        this.albumsRepository = albumsRepository
        this.logger = logger.child({}, {msgPrefix: 'DownloadAlbumsTask - '})

        this.syncRules = syncRules
        this.chunkSize = chunkSize
    }

    public async run() {
        for (const provider of this.providers) {
            const syncRules = this.syncRules[provider.getCode()]
            if (syncRules != undefined && syncRules.syncAlbums != undefined && !syncRules.syncAlbums) {
                continue
            }

            this.logger.info(`Downloading albums via provider: ${provider.getCode()}`)

            let albumsCount = 0
            while (true) {
                const ids = this.albumsRepository.getIdsToDownload(provider.getCode(), this.chunkSize)
                if (ids.length == 0) {
                    break
                }

                this.albumsRepository.setStatus('processing', ids, provider.getCode())
                const downloadedIds = await provider.downloadAlbums(ids)
                const nonDownloadedIds = ids.filter(id => !downloadedIds.includes(id))

                this.albumsRepository.setStatus('downloaded', downloadedIds, provider.getCode())
                this.albumsRepository.setStatus('error', nonDownloadedIds, provider.getCode())

                albumsCount += downloadedIds.length
            }

            this.logger.info(`Downloaded ${albumsCount} album(s) via provider: ${provider.getCode()}`)
        }
    }
}