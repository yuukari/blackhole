export type Config = {
    debugMode: boolean
    databasePath: string
    mediaPath: string
    processChunkSize: number
    syncSchedule: string
    syncOnStart: boolean

    syncRules: Record<string, SyncRules>

    yandexMusic: YandexMusicConfig
    telegramBot: TelegramBotConfig
}
export type SyncRules = {
    syncTracks: boolean | undefined
    syncAlbums: boolean | undefined
    excludeTracks: string[] | undefined
    excludeAlbums: string[] | undefined
    excludeArtists: string[] | undefined
}

export type YandexMusicConfig = {
    apiBaseUrl: string
    token: string
    scanDelay: number
    directoryName: string
    syncFromDate: Date | undefined
    downloaderArgs: string[]
    maxActiveDownloads: number
}

export type TelegramBotConfig = {
    enabled: boolean,
    token: string,
    allowedUsers: string[]

    alternateApi: boolean
    alternateApiUrl: string | undefined
    alternateStorageUrl: string | undefined

    directoryName: string
    syncFromDate: Date | undefined
    maxActiveDownloads: number
}
