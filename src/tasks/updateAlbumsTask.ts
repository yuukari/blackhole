import { type Logger } from 'pino'

import type { SyncRules } from '../config/index.js'
import type { Task } from './types.js'
import type { Provider, ProviderAlbum } from '../provider/index.js'
import { AlbumsRepository } from '../database/repository/index.js'

export class UpdateAlbumsTask implements Task {
    private readonly providers: Provider[]
    private readonly albumsRepository: AlbumsRepository
    private readonly logger: Logger
    private readonly syncRules: Record<string, SyncRules>
    private readonly chunkSize: number

    public constructor(providers: Provider[], albumsRepository: AlbumsRepository, logger: Logger,  syncRules: Record<string, SyncRules>, chunkSize: number) {
        this.providers = providers
        this.albumsRepository = albumsRepository
        this.logger = logger.child({}, {msgPrefix: 'UpdateAlbumsTask - '})

        this.syncRules = syncRules
        this.chunkSize = chunkSize
    }

    public async run() {
        for (const provider of this.providers) {
            const syncRules = this.syncRules[provider.getCode()]
            if (syncRules != undefined && syncRules.syncAlbums != undefined && !syncRules.syncAlbums) {
                continue
            }

            this.logger.info(`Updating albums database via provider: ${provider.getCode()}`)

            let albumsCount = 0
            for await (const albumsIds of provider.getAlbumsIds(this.chunkSize)) {
                const existingAlbumsIds = this.albumsRepository.getExistingIds(albumsIds, provider.getCode())
                const newAlbumsIds = albumsIds.filter(id => !existingAlbumsIds.includes(id))

                if (newAlbumsIds.length == 0) {
                    continue
                }

                let albums = await provider.getAlbumsInfo(newAlbumsIds)
                if (syncRules != undefined) {
                    albums = this.filterByRules(albums, syncRules)
                }
                this.albumsRepository.add(albums, provider.getCode())

                albumsCount += albums.length
            }

            this.logger.info(`Added ${albumsCount} new album(s) to database via provider: ${provider.getCode()}`)
        }
    }

    private filterByRules(albums: ProviderAlbum[], rules: SyncRules): ProviderAlbum[] {
        const excludeAlbums = rules.excludeAlbums ? rules.excludeAlbums.map(album => album.toLowerCase()) : []
        const excludeArtists = rules.excludeArtists ? rules.excludeArtists.map(artist => artist.toLowerCase()) : []

        return albums.filter(album => {
            for (const excludedTitle of excludeAlbums) {
                if (album.title.toLowerCase().includes(excludedTitle)) {
                    return false
                }
            }
            for (const excludedArtist of excludeArtists) {
                for (const artist of album.artists) {
                    if (artist.toLowerCase().includes(excludedArtist)) {
                        return false
                    }
                }
            }
            return true
        })
    }
}