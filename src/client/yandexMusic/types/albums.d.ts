import type { Pager } from './base.js'
import type { Artist } from './artists.js'

export type LikedAlbums = {
    albums: AlbumShort[]
    pager: Pager
}

export type AlbumShort = {
    id: number
    timestamp: string
}

export type Album = {
    id: number
    title: string
    type: string
    mediaType: string
    year: number
    releaseDate: string
    coverUri: string
    ogImage: string
    artists: Artist[]
}