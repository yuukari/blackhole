start = <b>👋 Hi, { $username }!</b>

    🎵 To add music to your library, send me any message with audio or document attachments.

    Use /help to see the list of available commands and features.

addToQueue-added = 🎵 Download of <b>{ $title }</b> has been added to the queue.

    Use /queue to view the queue.

addToQueue-alreadyAdded = ℹ️ <b>{ $title }</b> is already in the queue or has been downloaded.

    Use /queue to view the queue.

addToQueue-audioTooLarge = ⚠️ File <b>{ $file_name }</b> is too large to upload.

    In the mode without an alternative Telegram API, files up to 20 megabytes are supported.

addToQueue-docTooLarge = ⚠️ File <b>{ $file_name }</b> is too large to upload.

    In the mode without a local Telegram API, files up to 20 megabytes are supported.

addToQueue-docUnknownType = ⚠️ Could not determine the file type for document <b>{ $file_name }</b>.

addToQueue-docNotAudioType = ⚠️ File <b>{ $file_name }</b> is not an audio file (mime type: { $mime_type }).

queue-empty = ⬇️ The download queue is <b>empty</b>.

queue-list = <b>⬇️ Download queue</b>

    <blockquote>{ $items }</blockquote>

    Page: <b>{ $page } of { $totalPages }</b>

fallback = 🤔 I don't understand you.

    Use /help to see the list of available commands and features.

error = <b>⚠️ An error occurred while processing.</b>

    Details:
    <pre>{ $error }</pre>

cmd-queue = Show the download queue
cmd-help = List of available commands and features