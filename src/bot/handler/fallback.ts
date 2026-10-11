import type { Bot, Context } from 'grammy'

export default class FallbackHandler {
    public register(bot: Bot): void {
        bot.on('message', this.handle)
    }

    private handle = async (ctx: Context): Promise<void> => {
        await ctx.reply(
            '<b>🤔 Не понимаю вас.</b>\n\nДля просмотра списка доступных команд и возможностей используйте /help',
            {parse_mode: 'HTML'},
        )
    }
}