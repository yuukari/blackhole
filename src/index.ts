import Database from 'better-sqlite3'
import { gracefulShutdown, scheduleJob } from 'node-schedule'
import type { Logger } from 'pino'

import { loadConfig } from './config/index.js'
import { createLogger } from './logger/index.js'

import { Migrator } from './database/index.js'
import { AlbumsRepository, TracksRepository } from './database/repository/index.js'

import type { Provider } from './provider/index.js'
import { YandexMusicProvider } from './provider/index.js'
import { DownloadAlbumsTask, DownloadTracksTask, type Task, UpdateAlbumsTask, UpdateTracksTask } from './tasks/index.js'

let logger: Logger
let isSyncRunning = false

async function boot() {
    const config = loadConfig()
    logger = createLogger(config.debugMode)
    logger.info('Starting blackhole v0.1.0')

    const db = new Database(config.databasePath)
    const migrator = new Migrator(db)
    await migrator.migrate()

    const tracksRepository = new TracksRepository(db)
    const albumsRepository = new AlbumsRepository(db)

    const providers: Provider[] = [
        new YandexMusicProvider(config.yandexMusic, config.mediaPath, logger),
    ]
    for (const provider of providers) {
        await provider.init()
    }

    const tasks = [
        new UpdateTracksTask(providers, tracksRepository, logger, config.syncRules, config.processChunkSize),
        new UpdateAlbumsTask(providers, albumsRepository, logger, config.syncRules, config.processChunkSize),
        new DownloadTracksTask(providers, tracksRepository, logger, config.syncRules, config.processChunkSize),
        new DownloadAlbumsTask(providers, albumsRepository, logger, config.syncRules, config.processChunkSize),
    ]
    logger.info('blackhole ready')

    if (process.argv.length > 1 && process.argv[2] == '--once') {
        logger.info('Running one time sync')
        await runTasks(tasks)
        db.close()
        return
    }

    const syncJob = scheduleJob(config.syncSchedule, async () => runTasks(tasks))
    logger.info(`Sync schedule set to: ${config.syncSchedule}`)

    process.on('SIGINT', async function () {
        logger.info('Received interrupt signal, blackhole exiting')
        await gracefulShutdown()
        db.close()
        process.exit(0)
    })

    if (config.syncOnStart) {
        syncJob.invoke()
    }
}

async function runTasks(tasks: Task[]) {
    if (isSyncRunning) {
        logger.info('Skipping scheduled tasks run: previous tasks not completed yet')
        return
    }
    logger.info('Running sync tasks')

    isSyncRunning = true
    const syncStartAt = new Date()
    for (const task of tasks) {
        try {
            await task.run()
        } catch (e: unknown) {
            logger.error(e, 'Sync task failed')
        }
    }
    isSyncRunning = false
    const syncEndAt = new Date()

    logger.info(`Sync done in ${getDuration(syncStartAt, syncEndAt)}`)
}

function getDuration(startAt: Date, endAt: Date) {
    const seconds = (endAt.getTime() - startAt.getTime()) / 1000
    if (seconds < 60) {
        return `${seconds.toFixed(2)} second(s)`
    }
    if (seconds < 3600) {
        return `${(seconds / 60).toFixed(2)} minute(s)`
    }
    return `${Math.floor(seconds / 3600)} hour(s) and ${((seconds % 3600) / 60).toFixed(2)} minute(s)`
}

boot().catch((e: unknown) => {
    if (logger != undefined) {
        logger.error(e, 'Failed to start blackhole')
        return
    }
    console.error('Failed to start blackhole', e)
})