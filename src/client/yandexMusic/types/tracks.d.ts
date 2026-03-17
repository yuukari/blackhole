import type { Artist } from './artists.js'
import type { Album } from './albums.js'

export type LikedTracks = {
    library: LikedTracksLibrary
}

export type LikedTracksLibrary = {
    uid: number,
    revision: number,
    playlistUuid: string,
    tracks: TrackShort[]
}

export type TrackShort = {
    id: string
    albumId: string
    timestamp: string
}

export type Track = {
    id: string
    title: string
    available: boolean
    availableForPremiumUsers: boolean
    availableFullWithoutPermission: boolean
    availableForOptions: string[]
    disclaimers: string[]
    durationMs: number
    fileSize: number
    artists: Artist[]
    albums: Album[]
    coverUri: string
    ogImage: string
    lyricsAvailable: boolean
    type: string
}