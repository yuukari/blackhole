export type BaseResponse<T> = {
    result: T
}

export type Pager = {
    page: number
    perPage: number
    total: number
}