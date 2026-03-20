export type ProviderAlbum = {
    id: string
    title: string
    artists: string[]
}

export type ProviderTrack = {
    id: string
    title: string
    artists: string[]
}

export interface Provider {
    getCode(): string

    init(): Promise<void>

    getTracksIds(chunkSize: number): AsyncGenerator<string[]>
    getTracksInfo(ids: string[]): Promise<ProviderTrack[]>
    downloadTracks(ids: string[]): Promise<string[]>

    getAlbumsIds(chunkSize: number): AsyncGenerator<string[]>
    getAlbumsInfo(ids: string[]): Promise<ProviderAlbum[]>
    downloadAlbums(ids: string[]): Promise<string[]>
}