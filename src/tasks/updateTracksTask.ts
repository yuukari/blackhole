import { type Logger } from 'pino'

import type { SyncRules } from '../config/index.js'
import type { Task } from './types.js'
import type { Provider, ProviderTrack } from '../provider/index.js'
import { TracksRepository } from '../database/repository/index.js'

export class UpdateTracksTask implements Task {
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
        this.logger = logger.child({}, {msgPrefix: 'UpdateTracksTask - '})

        this.syncRules = syncRules
        this.chunkSize = chunkSize
    }

    public async run() {
        for (const provider of this.providers) {
            const syncRules = this.syncRules[provider.getCode()]
            if (syncRules != undefined && syncRules.syncTracks != undefined && !syncRules.syncTracks) {
                continue
            }

            this.logger.info(`Updating tracks database via provider: ${provider.getCode()}`)

            let tracksCount = 0
            for await (const tracksIds of provider.getTracksIds(this.chunkSize)) {
                const existingTracksIds = this.tracksRepository.getExistingIds(tracksIds, provider.getCode())
                const newTracksIds = tracksIds.filter(id => !existingTracksIds.includes(id))

                if (newTracksIds.length == 0) {
                    continue
                }

                let tracks = await provider.getTracksInfo(newTracksIds)
                if (syncRules != undefined) {
                    tracks = this.filterByRules(tracks, syncRules)
                }
                this.tracksRepository.add(tracks, provider.getCode())

                tracksCount += tracks.length
            }

            this.logger.info(`Added ${tracksCount} new track(s) to database via provider: ${provider.getCode()}`)
        }
    }

    private filterByRules(tracks: ProviderTrack[], rules: SyncRules): ProviderTrack[] {
        const excludeTracks = rules.excludeTracks ? rules.excludeTracks.map(track => track.toLowerCase()) : []
        const excludeArtists = rules.excludeArtists ? rules.excludeArtists.map(artist => artist.toLowerCase()) : []

        return tracks.filter(track => {
            for (const excludedTitle of excludeTracks) {
                if (track.title.toLowerCase().includes(excludedTitle)) {
                    return false
                }
            }
            for (const excludedArtist of excludeArtists) {
                for (const artist of track.artists) {
                    if (artist.toLowerCase().includes(excludedArtist)) {
                        return false
                    }
                }
            }
            return true
        })
    }
}