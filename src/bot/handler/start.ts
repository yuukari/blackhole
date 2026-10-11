import type { Bot, Context } from 'grammy'
import type { Logger } from 'pino'

export default class StartHandler {
    public register(bot: Bot): void {
        bot.command('start', this.handle)
    }

    private handle = async (ctx: Context): Promise<void> => {
        await ctx.reply(
            `<b>👋 Привет, @${ctx.from!.username}!</b>\n\n🎵 Для добавления музыки в библиотеку пришлите мне любое сообщение с вложениями в виде аудио или документов.\n\nДля просмотра списка доступных команд и возможностей используйте /help`,
            {parse_mode: 'HTML'},
        )
    }
}