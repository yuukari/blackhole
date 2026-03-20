import type { Logger } from 'pino'

import type { SyncRules } from '../config/index.js'
import type { Task } from './types.js'
import type { Provider } from '../provider/index.js'
import { TracksRepository } from '../database/repository/index.js'

export class DownloadTracksTask implements Task {
    private readonly providers: Provider[]
    private readonly tracksRepository: TracksRepository
    private readonly logger: Logger
    private readonly syncRules: Record<string, SyncRules>
    private readonly chunkSize: number

    public constructor(
        providers: Provider[],
        tracksRepository: TracksRepository,
        logger: Logger,
        syncRules: Record<string, SyncRules>,
        chunkSize: number,
    ) {
        this.providers = providers
        this.tracksRepository = tracksRepository
        this.logger = logger.child({}, {msgPrefix: 'DownloadTracksTask - '})

        this.syncRules = syncRules
        this.chunkSize = chunkSize
    }

    public async run() {
        for (const provider of this.providers) {
            const syncRules = this.syncRules[provider.getCode()]
            if (syncRules != undefined && syncRules.syncTracks != undefined && !syncRules.syncTracks) {
                continue
            }

            this.logger.info(`Downloading tracks via provider: ${provider.getCode()}`)

            let tracksCount = 0
            while (true) {
                const ids = this.tracksRepository.getIdsToDownload(provider.getCode(), this.chunkSize)
                if (ids.length == 0) {
                    break
                }

                this.tracksRepository.setStatus('processing', ids, provider.getCode())
                const downloadedIds = await provider.downloadTracks(ids)
                const nonDownloadedIds = ids.filter(id => !downloadedIds.includes(id))

                this.tracksRepository.setStatus('downloaded', downloadedIds, provider.getCode())
                this.tracksRepository.setStatus('error', nonDownloadedIds, provider.getCode())

                tracksCount += downloadedIds.length
            }

            this.logger.info(`Downloaded ${tracksCount} track(s) via provider: ${provider.getCode()}`)
        }
    }
}