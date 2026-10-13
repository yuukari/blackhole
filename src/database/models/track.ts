export type TrackModel = {
    id: string
    provider: string
    title: string
    artists: string
    status: 'pending' | 'processing' | 'downloaded' | 'error'
    added_at: number
}