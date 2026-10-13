import { type Bot, InlineKeyboard } from 'grammy'

import type { TelegramBotContext } from '../index.js'

import { TelegramBotQueueRepository } from '../../database/repository/index.js'

export default class ClearQueueHandler {
    public constructor(
        private readonly telegramBotQueueRepository: TelegramBotQueueRepository,
    ) {}

    public register(bot: Bot<TelegramBotContext>): void {
        bot.callbackQuery('queue:clear', this.handle)
    }

    private handle = async (ctx: TelegramBotContext): Promise<void> => {
        this.telegramBotQueueRepository.clearPendingTracks()
        await ctx.editMessageText(ctx.t('queue-cleared'), {parse_mode: 'HTML'})
    }
}