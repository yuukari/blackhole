import type { Bot } from 'grammy'

import type { TelegramBotContext } from '../index.js'

export default class FallbackHandler {
    public register(bot: Bot<TelegramBotContext>): void {
        bot.on('message', this.handle)
    }

    private handle = async (ctx: TelegramBotContext): Promise<void> => {
        await ctx.reply(ctx.t('fallback'), { parse_mode: 'HTML' })
    }
}