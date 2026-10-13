import type { Bot } from 'grammy'
import type { Logger } from 'pino'

import type { TelegramBotContext } from '../index.js'

import { TelegramBotQueueRepository } from '../../database/repository/index.js'

export default class AddToQueueHandler {
    private readonly maxCloudFileSize = 20 * 1024 * 1024

    public constructor(
        private readonly useAlternateApi: boolean,
        private readonly telegramBotQueueRepository: TelegramBotQueueRepository,
        private readonly logger: Logger,
    ) {}

    public register(bot: Bot<TelegramBotContext>): void {
        bot.on('message:audio', this.handleAudio)
        bot.on('message:document', this.handleDocument)
    }

    private handleAudio = async (ctx: TelegramBotContext): Promise<void> => {
        const audio = ctx.message?.audio
        if (audio === undefined) {
            throw new Error('No audio attachment in this message')
        }

        if (!this.useAlternateApi && audio.file_size !== undefined && audio.file_size > this.maxCloudFileSize) {
            await ctx.reply(
                ctx.t('addToQueue-audioTooLarge', {file_name: audio.file_name!}),
                {parse_mode: 'HTML'},
            )
            return
        }

        this.logger.debug(`Adding audio attachment from message to download queue, file id: ${audio.file_id}`)

        let title = audio.file_name!
        if (audio.performer !== undefined && audio.title !== undefined) {
            title = `${audio.performer} - ${audio.title}`
        }

        if (this.telegramBotQueueRepository.add(
            audio.file_id,
            audio.file_name!,
            audio.title,
            audio.performer,
        )) {
            await ctx.reply(ctx.t('addToQueue-added', {title: title}), {parse_mode: 'HTML'})
            return
        }
        await ctx.reply(ctx.t('addToQueue-alreadyAdded', {title: title}), {parse_mode: 'HTML'})
    }

    private handleDocument = async (ctx: TelegramBotContext): Promise<void> => {
        const document = ctx.message?.document
        if (document === undefined) {
            throw new Error('No document attachment in this message')
        }

        if (!this.useAlternateApi && document.file_size !== undefined && document.file_size > this.maxCloudFileSize) {
            await ctx.reply(
                ctx.t('addToQueue-docTooLarge', {file_name: document.file_name!}),
                {parse_mode: 'HTML'},
            )
            return
        }
        if (document.mime_type === undefined) {
            await ctx.reply(
                ctx.t('addToQueue-docUnknownType', {file_name: document.file_name!}),
                {parse_mode: 'HTML'},
            )
            return
        }
        if (!document.mime_type.startsWith('audio')) {
            await ctx.reply(
                ctx.t('addToQueue-docNotAudioType', {file_name: document.file_name!, mime_type: document.mime_type}),
                {parse_mode: 'HTML'},
            )
            return
        }

        this.logger.debug(`Adding document attachment from message to download queue, file id: ${document.file_id}`)

        if (this.telegramBotQueueRepository.add(document.file_id, document.file_name!)) {
            await ctx.reply(ctx.t('addToQueue-added', {title: document.file_name!}), {parse_mode: 'HTML'})
            return
        }
        await ctx.reply(ctx.t('addToQueue-alreadyAdded', {title: document.file_name!}), {parse_mode: 'HTML'})
    }
}