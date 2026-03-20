export type AlbumModel = {
    id: string
    provider: string
    title: string
    artists: string
    status: 'pending' | 'processing' | 'downloaded' | 'error'
    addedAt: number
}