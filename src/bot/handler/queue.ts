import { type Bot, InlineKeyboard } from 'grammy'

import type { TelegramBotContext } from '../index.js'

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

    public register(bot: Bot<TelegramBotContext>): void {
        bot.command('queue', this.handle)
        bot.callbackQuery(/^queue:page:\d+$/, this.handleCallback)
    }

    private handle = async (ctx: TelegramBotContext): Promise<void> => {
        const {text, keyboard} = this.render(ctx, 1)
        await ctx.reply(
            text,
            {
                reply_markup: keyboard,
                parse_mode: 'HTML',
            },
        )
    }

    private handleCallback = async (ctx: TelegramBotContext): Promise<void> => {
        const callbackData = ctx.callbackQuery?.data ?? ''
        const match = /^queue:page:(\d+)$/.exec(callbackData)
        if (match === null) {
            await ctx.answerCallbackQuery()
            return
        }

        const page = Number(match[1] ?? 1)
        const {text, keyboard} = this.render(ctx, page)
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

    private render(ctx: TelegramBotContext, page: number): QueuePage {
        const queueCount = this.telegramBotQueueRepository.getPendingTracksCount()
        if (queueCount === 0) {
            return {
                text: ctx.t('queue-empty'),
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

        return {
            text: ctx.t('queue-list', { items: queue.join('\n'), page, totalPages }),
            keyboard: keyboard,
        }
    }
}