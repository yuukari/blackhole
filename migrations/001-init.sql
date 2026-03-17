--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE blackhole_tracks
(
    id       TEXT NOT NULL,
    provider TEXT NOT NULL,
    title    TEXT NOT NULL,
    artists  TEXT NOT NULL,
    status   TEXT NOT NULL DEFAULT 'pending',
    added_at INTEGER       DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY (id, provider)
);

CREATE TABLE blackhole_albums
(
    id       TEXT NOT NULL,
    provider TEXT NOT NULL,
    title    TEXT NOT NULL,
    artists  TEXT NOT NULL,
    status   TEXT NOT NULL DEFAULT 'pending',
    added_at INTEGER       DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY (id, provider)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE blackhole_albums;
DROP TABLE blackhole_tracks;