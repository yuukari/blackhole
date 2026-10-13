import type { Database } from 'better-sqlite3'

import type { TelegramBotQueueModel } from '../models/index.js'

export class TelegramBotQueueRepository {
    private readonly db: Database

    public constructor(db: Database) {
        this.db = db
    }

    public add(
        fileId: string,
        fileName: string,
        title: string | undefined = undefined,
        artists: string | undefined = undefined,
    ): boolean {
        const stmt = this.db.prepare<TelegramBotQueueModel>(`
            INSERT INTO
                blackhole_telegram_bot_queue
                (id, file_name, title, artists, status, added_at)
            VALUES
                (@id, @file_name, @title, @artists, @status, @added_at)
            ON CONFLICT (id) DO NOTHING
        `)

        const {changes} = stmt.run({
            id: fileId,
            file_name: fileName,
            title: title,
            artists: artists,
            status: 'pending',
            added_at: Date.now(),
        })
        return changes !== 0
    }

    public getPendingTracksCount(): number {
        const stmt = this.db.prepare<[], {count: number}>(`
            SELECT COUNT(*) AS count
            FROM blackhole_telegram_bot_queue
            WHERE
                status = 'pending'
        `)
        const result = stmt.get()
        return result?.count ?? 0
    }

    public getPendingTracks(limit: number, fromDate: Date | undefined): TelegramBotQueueModel[] {
        if (fromDate) {
            const stmt = this.db.prepare<number[], TelegramBotQueueModel>(`
                SELECT *
                FROM
                    blackhole_telegram_bot_queue
                WHERE
                    status = 'pending' AND
                    added_at >= ?
                ORDER BY
                    added_at
                LIMIT ?
            `)
            return stmt.all(fromDate.getTime(), limit)
        }

        const stmt = this.db.prepare<(number)[], TelegramBotQueueModel>(`
            SELECT *
            FROM
                blackhole_telegram_bot_queue
            WHERE
                status = 'pending'
            ORDER BY
                added_at
            LIMIT ?
        `)
        return stmt.all(limit)
    }

    public getPendingTracksForQueue(limit: number, offset: number): TelegramBotQueueModel[] {
        const stmt = this.db.prepare<(number)[], TelegramBotQueueModel>(`
            SELECT *
            FROM
                blackhole_telegram_bot_queue
            WHERE
                status = 'pending'
            ORDER BY
                added_at
            LIMIT ? OFFSET ?
        `)
        return stmt.all(limit, offset)
    }

    public clearPendingTracks() {
        const stmt = this.db.prepare<string[]>(`
            DELETE
            FROM
                blackhole_telegram_bot_queue
            WHERE
                status = ?
        `)
        stmt.run('pending')
    }

    public getTracksByIds(ids: string[]): TelegramBotQueueModel[] {
        if (ids.length == 0) {
            return []
        }
        const stmt = this.db.prepare<string[], TelegramBotQueueModel>(`
            SELECT *
            FROM
                blackhole_telegram_bot_queue
            WHERE
                id IN (${ids.map(() => '?').join(',')})
        `)
        return stmt.all(...ids)
    }

    public getTrackById(id: string): TelegramBotQueueModel | undefined {
        const stmt = this.db.prepare<string, TelegramBotQueueModel>(`
            SELECT *
            FROM blackhole_telegram_bot_queue
            WHERE
                id = ?
        `)
        return stmt.get(id)
    }

    public setStatus(status: string, ids: string[]) {
        if (ids.length == 0) {
            return
        }
        const stmt = this.db.prepare<string[]>(`
            UPDATE blackhole_telegram_bot_queue
            SET
                status = ?
            WHERE
                id IN (${ids.map(() => '?').join(',')})
        `)
        stmt.run(status, ...ids)
    }
}