import type { Database } from 'better-sqlite3'

import type { AlbumModel } from '../models/index.js'
import type { ProviderAlbum } from '../../provider/index.js'

export class AlbumsRepository {
    private readonly db: Database

    public constructor(db: Database) {
        this.db = db
    }

    public add(albums: ProviderAlbum[], provider: string) {
        const stmt = this.db.prepare<AlbumModel>(`
            INSERT INTO
                blackhole_albums
                (id, provider, title, artists, status, added_at)
            VALUES
                (@id, @provider, @title, @artists, @status, @addedAt)
        `)

        const tx = this.db.transaction((albums: ProviderAlbum[]) => {
            for (const album of albums) {
                stmt.run({
                    id: album.id,
                    provider: provider,
                    title: album.title,
                    artists: album.artists.join('; '),
                    status: 'pending',
                    addedAt: Date.now()
                })
            }
        })

        tx(albums)
    }

    public getExistingIds(ids: string[], provider: string): string[] {
        if (ids.length == 0) {
            return []
        }
        const stmt = this.db.prepare<string[], AlbumModel>(`
            SELECT id FROM blackhole_albums WHERE provider = ? AND id IN (${ids.map(() => '?').join(',')})
        `)
        return stmt.all(provider, ...ids).map((row => row.id))
    }

    public getIdsToDownload(provider: string, limit: number): string[] {
        const stmt = this.db.prepare<(string|number)[], AlbumModel>(`
            SELECT id FROM blackhole_albums WHERE provider = ? AND NOT status = 'downloaded' ORDER BY added_at DESC LIMIT ?
        `)
        return stmt.all(provider, limit).map((row => row.id))
    }

    public setStatus(status: string, ids: string[], provider: string) {
        if (ids.length == 0) {
            return
        }
        const stmt = this.db.prepare<string[]>(`
            UPDATE blackhole_albums SET status = ? WHERE provider = ? AND id IN (${ids.map(() => '?').join(',')})
        `)
        stmt.run(status, provider, ...ids)
    }
}