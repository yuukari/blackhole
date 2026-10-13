import { fileURLToPath } from 'node:url'

import { I18n } from '@grammyjs/i18n'

import type { TelegramBotContext } from './bot.js'

export const DEFAULT_LOCALE = 'en'

export const i18n = new I18n<TelegramBotContext>({
    defaultLocale: DEFAULT_LOCALE,
    directory: fileURLToPath(new URL('../../locales', import.meta.url)),
    fluentBundleOptions: {useIsolating: false},
})