import type { Database } from 'better-sqlite3'

import type { IMigration } from '@blackglory/better-sqlite3-migrations'
import { migrate } from '@blackglory/better-sqlite3-migrations'
import { findMigrationFilenames, readMigrationFile } from 'migration-files'

export class Migrator {
    private readonly db: Database

    public constructor(db: Database) {
        this.db = db
    }

    public async migrate() {
        const migrationsFilenames = await findMigrationFilenames('./migrations')
        const migrationsData: IMigration[] = []
        for (const filename of migrationsFilenames) {
            migrationsData.push(await readMigrationFile(filename))
        }
        migrate(this.db, migrationsData, {
            throwOnNewerVersion: true,
        })
    }
}