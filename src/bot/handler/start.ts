import type { Bot } from 'grammy'

import type { TelegramBotContext } from '../index.js'

export default class StartHandler {
    public register(bot: Bot<TelegramBotContext>): void {
        bot.command('start', this.handle)
    }

    private handle = async (ctx: TelegramBotContext): Promise<void> => {
        await ctx.reply(
            ctx.t('start', { username: ctx.from!.username! }),
            {parse_mode: 'HTML'},
        )
    }
}