-- Audit log of every meaningful event in the presence flow.
-- Currently we only write 'completion' rows, but the schema supports more types
-- (e.g. 'share', 'visit') if we want to expand later.

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            INTEGER NOT NULL,         -- unix epoch ms (server time)
  day           TEXT    NOT NULL,         -- YYYY-MM-DD (UTC) for fast daily rollups
  event_type    TEXT    NOT NULL,         -- 'completion' for now
  anon_id       TEXT,                     -- localStorage userId (browser-scoped UUID)
  came_from_ref TEXT,                     -- ?ref= value if this user arrived via someone's share
  ua            TEXT,                     -- user-agent (truncated to 200 chars)
  ip_day_hash   TEXT                      -- sha256(ip + '|' + day): coarse abuse signal only
);

CREATE INDEX IF NOT EXISTS idx_events_day  ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_anon ON events(anon_id);
