import fetch, { Response } from 'node-fetch'

import type { BaseResponse } from './types/base.js'
import type { AccountSettings } from './types/account.js'
import type { LikedTracks, Track } from './types/tracks.js'
import type { Album, LikedAlbums } from './types/albums.js'
import { clearTimeout } from 'node:timers'

export class YandexMusicClient {
    private readonly apiBaseUrl: string
    private readonly token: string
    private readonly additionalHeaders: Record<string, string> | undefined
    private readonly timeout: number

    public constructor(apiBaseUrl: string, token: string, additionalHeaders: Record<string, string> | undefined, timeout: number = 20) {
        this.apiBaseUrl = apiBaseUrl
        this.token = token
        this.additionalHeaders = additionalHeaders
        this.timeout = timeout
    }

    public async getAccountSettings(): Promise<AccountSettings> {
        const {result} = await this.sendRequest<BaseResponse<AccountSettings>>('GET', '/account/settings')
        return result
    }

    public async getLikedTracks(userId: number): Promise<LikedTracks> {
        const {result} = await this.sendRequest<BaseResponse<LikedTracks>>('GET', `/users/${userId}/likes/tracks`)
        return result
    }

    public async getTracksInfo(ids: string[]): Promise<Track[]> {
        const body = new URLSearchParams()
        ids.forEach(id => body.append('track-ids', id))
        const {result} = await this.sendRequest<BaseResponse<Track[]>>('POST', '/tracks', body)
        return result
    }

    public async getLikedAlbums(userId: number, page: number, pageSize: number): Promise<BaseResponse<LikedAlbums>> {
        const queryParams = new URLSearchParams()
        queryParams.set('page', page.toString())
        queryParams.set('pageSize', pageSize.toString())
        return await this.sendRequest<BaseResponse<LikedAlbums>>(
            'GET',
            `/users/${userId}/likes/albums/page?${queryParams}`,
        )
    }

    public async getAlbumsInfo(ids: string[]): Promise<Album[]> {
        const body = new URLSearchParams()
        ids.forEach(id => body.append('album-ids', id))
        const {result} = await this.sendRequest<BaseResponse<Album[]>>('POST', '/albums', body)
        return result
    }

    private async sendRequest<T>(
        method: 'GET' | 'POST',
        path: string,
        body: URLSearchParams | null = null,
    ): Promise<T> {
        const url = `${this.apiBaseUrl}${path}`
        const headers = new Headers(this.additionalHeaders)
        headers.set('Authorization', `OAuth ${this.token}`)

        const abortController = new AbortController()
        const timeout = setTimeout(() => abortController.abort(), this.timeout * 1000)

        let response: Response
        try {
            response = await fetch(url, {
                method,
                body,
                headers,
                signal: abortController.signal
            })
        } catch (e: unknown) {
            throw new Error(`Failed to send ${method} ${url} request`)
        } finally {
            clearTimeout(timeout)
        }

        if (!response.ok) {
            throw new Error(`${method} ${url} failed with status code ${response.status}`)
        }
        return await response.json() as T
    }
}