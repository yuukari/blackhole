import { Bot } from 'grammy'
import type { Logger } from 'pino'

import type { TelegramBotConfig } from '../config/types.js'

import { AllowListMiddleware } from './middleware/index.js'
import { AddToQueueHandler, FallbackHandler, StartHandler, QueueHandler } from './handler/index.js'

import { TelegramBotQueueRepository } from '../database/repository/index.js'

export class TelegramBot {
    private readonly commands = [
        {
            command: 'queue',
            description: 'Показать очередь загрузок',
        },
        {
            command: 'help',
            description: 'Список доступных команд и возможностей',
        },
    ]

    private readonly config: TelegramBotConfig
    private readonly logger: Logger
    private readonly bot: Bot | undefined

    public constructor(
        config: TelegramBotConfig,
        telegramBotQueueRepository: TelegramBotQueueRepository,
        logger: Logger,
    ) {
        this.config = config
        this.logger = logger.child({}, {msgPrefix: 'TelegramBot - '})
        if (!this.config.enabled) {
            return
        }

        const allowList = new AllowListMiddleware(this.config.allowedUsers)

        this.bot = new Bot(this.config.token)
        this.bot.catch(async e => {
            this.logger.error(e.error, 'Error while handling telegram bot update')
            if (!e.ctx.chatId) {
                return
            }

            await this.bot!.api.sendMessage(
                e.ctx.chatId,
                `<b>⚠️ Произошла ошибка при обработке.</b>\n\nПодробная информация:\n<pre>${e.error}</pre>`,
                {
                    parse_mode: 'HTML',
                },
            )
        })

        this.bot.use(allowList.do)

        new StartHandler().register(this.bot)
        new AddToQueueHandler(telegramBotQueueRepository, this.logger).register(this.bot)
        new QueueHandler(telegramBotQueueRepository).register(this.bot)
        new FallbackHandler().register(this.bot)
    }

    public async start(): Promise<Bot | undefined> {
        if (this.bot === undefined) {
            return
        }

        this.logger.debug(`Starting telegram bot, allowed users ids: ${this.config.allowedUsers.join(', ')}`)
        await this.bot.api.setMyCommands(this.commands)

        this.bot.start().catch(e => this.logger.error(e, 'Critical error, telegram bot stopped'))
        return this.bot
    }

    public async stop(): Promise<void> {
        if (this.bot === undefined) {
            return
        }
        await this.bot.stop()
    }
}