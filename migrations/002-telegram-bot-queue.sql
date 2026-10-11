--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE blackhole_telegram_bot_queue
(
    id        TEXT NOT NULL,
    file_name TEXT NOT NULL,
    title     TEXT          DEFAULT NULL,
    artists   TEXT          DEFAULT NULL,
    status    TEXT NOT NULL DEFAULT 'pending',
    added_at  INTEGER       DEFAULT (STRFTIME('%s', 'now')),

    PRIMARY KEY (id)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE blackhole_telegram_bot_queue;
