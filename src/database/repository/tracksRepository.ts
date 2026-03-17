import type { Database } from 'better-sqlite3'

import type { TrackModel } from '../models/index.js'
import type { ProviderTrack } from '../../provider/index.js'

export class TracksRepository {
    private readonly db: Database

    public constructor(db: Database) {
        this.db = db
    }

    public add(tracks: ProviderTrack[], provider: string) {
        const stmt = this.db.prepare<TrackModel>(`
            INSERT INTO
                blackhole_tracks
                (id, provider, title, artists, status, added_at)
            VALUES
                (@id, @provider, @title, @artists, @status, @addedAt)
        `)

        const tx = this.db.transaction((tracks: ProviderTrack[]) => {
            for (const track of tracks) {
                stmt.run({
                    id: track.id,
                    provider: provider,
                    title: track.title,
                    artists: track.artists.join('; '),
                    status: 'pending',
                    addedAt: Date.now()
                })
            }
        })

        tx(tracks)
    }

    public getExistingIds(ids: string[], provider: string): string[] {
        if (ids.length == 0) {
            return []
        }
        const stmt = this.db.prepare<string[], TrackModel>(`
            SELECT id FROM blackhole_tracks WHERE provider = ? AND id IN (${ids.map(() => '?').join(',')})
        `)
        return stmt.all(provider, ...ids).map((row => row.id))
    }

    public getIdsToDownload(provider: string, limit: number): string[] {
        const stmt = this.db.prepare<(string|number)[], TrackModel>(`
            SELECT id FROM blackhole_tracks WHERE provider = ? AND NOT status = 'downloaded' ORDER BY added_at DESC LIMIT ?
        `)
        return stmt.all(provider, limit).map((row => row.id))
    }

    public setStatus(status: string, ids: string[], provider: string) {
        if (ids.length == 0) {
            return
        }
        const stmt = this.db.prepare<string[]>(`
            UPDATE blackhole_tracks SET status = ? WHERE provider = ? AND id IN (${ids.map(() => '?').join(',')})
        `)
        stmt.run(status, provider, ...ids)
    }
}