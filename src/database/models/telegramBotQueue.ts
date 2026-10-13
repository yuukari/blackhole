export type TelegramBotQueueModel = {
    id: string
    file_name: string
    title: string | undefined
    artists: string | undefined
    status: 'pending' | 'processing' | 'downloaded'
    added_at: number
}