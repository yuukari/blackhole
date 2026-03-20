export type Config = {
    debugMode: boolean
    databasePath: string
    mediaPath: string
    processChunkSize: number
    syncSchedule: string
    syncOnStart: boolean

    syncRules: Record<string, SyncRules>
    yandexMusic: YandexMusicConfig
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

export type SyncRules = {
    syncTracks: boolean | undefined
    syncAlbums: boolean | undefined
    excludeTracks: string[] | undefined
    excludeAlbums: string[] | undefined
    excludeArtists: string[] | undefined
}