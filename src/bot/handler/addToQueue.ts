import type { Bot, Context } from 'grammy'
import type { Logger } from 'pino'

import { TelegramBotQueueRepository } from '../../database/repository/index.js'

export default class AddToQueueHandler {
    private readonly maxCloudFileSize = 20 * 1024 * 1024

    public constructor(
        private readonly telegramBotQueueRepository: TelegramBotQueueRepository,
        private readonly logger: Logger,
    ) {}

    public register(bot: Bot): void {
        bot.on('message:audio', this.handleAudio)
        bot.on('message:document', this.handleDocument)
    }

    private handleAudio = async (ctx: Context): Promise<void> => {
        const audio = ctx.message?.audio
        if (audio === undefined) {
            throw new Error('No audio attachment in this message')
        }

        if (audio.file_size !== undefined && audio.file_size > this.maxCloudFileSize) {
            await ctx.reply(
                `⚠️ Файл <b>${audio.file_name}</b> слишком большой для загрузки.\n\nВ режиме работы без локального Telegram API поддерживаются файлы размером до 20 мегабайт.`,
                {parse_mode: 'HTML'},
            )
            return
        }

        this.logger.debug(`Adding audio attachment from message to download queue, file id: ${audio.file_id}`)

        let title = audio.file_name
        if (audio.performer !== undefined && audio.title !== undefined) {
            title = `${audio.performer} - ${audio.title}`
        }

        if (this.telegramBotQueueRepository.add(
            audio.file_id,
            audio.file_name!,
            audio.title,
            audio.performer,
        )) {
            await ctx.reply(
                `🎵 Загрузка <b>${title}</b> добавлена в очередь.\n\nДля просмотра очереди используйте /queue`,
                {parse_mode: 'HTML'},
            )
            return
        }
        await ctx.reply(
            `ℹ️ <b>${title}</b> уже добавлен в очередь или был загружен.\n\nДля просмотра очереди используйте /queue`,
            {parse_mode: 'HTML'},
        )
    }

    private handleDocument = async (ctx: Context): Promise<void> => {
        const document = ctx.message?.document
        if (document === undefined) {
            throw new Error('No document attachment in this message')
        }

        if (document.file_size !== undefined && document.file_size > this.maxCloudFileSize) {
            await ctx.reply(
                `⚠️ Файл <b>${document.file_name}</b> слишком большой для загрузки.\n\nВ режиме работы без локального Telegram API поддерживаются файлы размером до 20 мегабайт.`,
                {parse_mode: 'HTML'},
            )
            return
        }
        if (document.mime_type === undefined) {
            await ctx.reply(
                `⚠️ Не удалось распознать тип файла для документа <b>${document.file_name}</b>.`,
                {parse_mode: 'HTML'},
            )
            return
        }
        if (!document.mime_type.startsWith('audio')) {
            await ctx.reply(
                `⚠️ Файл <b>${document.file_name}</b> не является аудиофайлом (mime-тип: ${document.mime_type}).`,
                {parse_mode: 'HTML'},
            )
            return
        }

        this.logger.debug(`Adding document attachment from message to download queue, file id: ${document.file_id}`)

        if (this.telegramBotQueueRepository.add(document.file_id, document.file_name!)) {
            await ctx.reply(
                `🎵 Загрузка <b>${document.file_name}</b> добавлена в очередь.\n\nДля просмотра очереди используйте /queue`,
                {parse_mode: 'HTML'},
            )
            return
        }
        await ctx.reply(
            `ℹ️ <b>${document.file_name}</b> уже добавлен в очередь или был загружен.\n\nДля просмотра очереди используйте /queue`,
            {parse_mode: 'HTML'},
        )
    }
}