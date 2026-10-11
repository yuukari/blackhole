import { type Bot, type Context, InlineKeyboard } from 'grammy'

import { TelegramBotQueueRepository } from '../../database/repository/index.js'

type QueuePage = {
    text: string
    keyboard: InlineKeyboard
}

export default class QueueHandler {
    private readonly pageSize = 10

    public constructor(
        private readonly telegramBotQueueRepository: TelegramBotQueueRepository,
    ) {}

    public register(bot: Bot): void {
        bot.command('queue', this.handle)
        bot.callbackQuery(/^queue:page:\d+$/, this.handleCallback)
    }

    private handle = async (ctx: Context): Promise<void> => {
        const {text, keyboard} = this.render(1)
        await ctx.reply(
            text,
            {
                reply_markup: keyboard,
                parse_mode: 'HTML',
            },
        )
    }

    private handleCallback = async (ctx: Context): Promise<void> => {
        const callbackData = ctx.callbackQuery?.data ?? ''
        const match = /^queue:page:(\d+)$/.exec(callbackData)
        if (match === null) {
            await ctx.answerCallbackQuery()
            return
        }

        const page = Number(match[1] ?? 1)
        const {text, keyboard} = this.render(page)
        try {
            await ctx.editMessageText(
                text,
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                },
            )
        } finally {
            await ctx.answerCallbackQuery()
        }
    }

    private render(page: number): QueuePage {
        const queueCount = this.telegramBotQueueRepository.getPendingTracksCount()
        if (queueCount === 0) {
            return {
                text: `⬇️ Очередь загрузок <b>пуста</b>.`,
                keyboard: new InlineKeyboard(),
            }
        }

        const offset = (page - 1) * this.pageSize
        const totalPages = Math.ceil(queueCount / this.pageSize)

        const queue = this.telegramBotQueueRepository.getPendingTracks(this.pageSize, offset)
            .map((track, i) => {
                const number = ++i + offset
                if (track.title && track.artists) {
                    return `${number}. ${track.artists} - ${track.title}`
                }
                return `${number}. ${track.file_name}`
            })

        const keyboard = new InlineKeyboard()
        if (page > 1) {
            keyboard.text('⬅️', `queue:page:${page - 1}`)
        }
        if (page < totalPages) {
            keyboard.text('➡️', `queue:page:${page + 1}`)
        }
        keyboard.row().text('🔄 Синхронизировать', 'queue:forceSync')

        return {
            text: `<b>⬇️ Очередь загрузок</b>\n\n<blockquote>${queue.join('\n')}</blockquote>\n\nСтраница: <b>${page} из ${totalPages}</b>`,
            keyboard: keyboard,
        }
    }
}