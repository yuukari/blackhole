export function sanitizePath(value: string): string {
    const cleaned = value
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
        .replace(/^\.+/, '')
        .replace(/\.+$/, '')
        .trim()
    return cleaned.length > 0 ? cleaned.slice(0, 200) : 'Unknown'
}