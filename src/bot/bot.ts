import { Bot, type Context } from 'grammy'
import type { LanguageCode } from 'grammy/types'
import type { I18nFlavor } from '@grammyjs/i18n'
import type { Logger } from 'pino'

import type { TelegramBotConfig } from '../config/types.js'

import { AllowListMiddleware } from './middleware/index.js'
import { DEFAULT_LOCALE, i18n } from './i18n.js'
import { AddToQueueHandler, FallbackHandler, StartHandler, QueueHandler } from './handler/index.js'

import { TelegramBotQueueRepository } from '../database/repository/index.js'

export type TelegramBotContext = Context & I18nFlavor

export class TelegramBot {
    private readonly config: TelegramBotConfig
    private readonly logger: Logger
    private readonly bot: Bot<TelegramBotContext> | undefined

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

        const botOptions = this.config.alternateApi
            ? {
                client: {
                    apiRoot: this.config.alternateApiUrl!,
                },
            }
            : {}

        this.bot = new Bot<TelegramBotContext>(this.config.token, botOptions)
        this.bot.catch(async e => {
            this.logger.error(e.error, 'Error while handling telegram bot update')
            if (!e.ctx.chatId) {
                return
            }

            await this.bot!.api.sendMessage(
                e.ctx.chatId,
                e.ctx.t('error', {error: String(e.error)}),
                {parse_mode: 'HTML'},
            )
        })

        this.bot.use(i18n)
        this.bot.use(new AllowListMiddleware(this.config.allowedUsers).do)

        new StartHandler().register(this.bot)
        new AddToQueueHandler(this.config.alternateApi, telegramBotQueueRepository, this.logger).register(this.bot)
        new QueueHandler(telegramBotQueueRepository).register(this.bot)
        new FallbackHandler().register(this.bot)
    }

    public async start(): Promise<Bot<TelegramBotContext> | undefined> {
        if (this.bot === undefined) {
            return
        }

        this.logger.debug(`Starting telegram bot, allowed users ids: ${this.config.allowedUsers.join(', ')}`)
        if (this.config.alternateApi) {
            this.logger.debug(`Using alternative Telegram bot API server (API URL: ${this.config.alternateApiUrl}; storage URL: ${this.config.alternateStorageUrl})`)
        }

        for (const locale of i18n.locales as LanguageCode[]) {
            await this.bot.api.setMyCommands(this.buildCommands(locale), { language_code: locale })
        }
        await this.bot.api.setMyCommands(this.buildCommands(DEFAULT_LOCALE))

        this.bot.start().catch(e => this.logger.error(e, 'Critical error, telegram bot stopped'))
        return this.bot
    }

    public async stop(): Promise<void> {
        if (this.bot === undefined) {
            return
        }
        await this.bot.stop()
    }

    private buildCommands(locale: string): { command: string, description: string }[] {
        return [
            { command: 'queue', description: i18n.t(locale, 'cmd-queue') },
            { command: 'help', description: i18n.t(locale, 'cmd-help') },
        ]
    }
}