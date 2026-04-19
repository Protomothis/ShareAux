-- ShareAux v0.1.2 → v0.1.3 마이그레이션
-- 실행 전 반드시 백업: pg_dump -U spotiparty spotiparty > backup.sql

BEGIN;

-- 1. tracks: youtube_id → source_id + provider 추가
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS provider varchar DEFAULT 'yt';
ALTER TABLE tracks RENAME COLUMN youtube_id TO source_id;
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS "UQ_tracks_youtube_id";
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS "tracks_youtube_id_key";
ALTER TABLE tracks ADD CONSTRAINT "UQ_tracks_provider_source_id" UNIQUE (provider, source_id);

-- 2. room_play_histories → play_histories (rename + 구조 변경)
ALTER TABLE room_play_histories RENAME TO play_histories;

-- room FK: CASCADE → SET NULL
ALTER TABLE play_histories DROP CONSTRAINT IF EXISTS "FK_play_histories_room";
ALTER TABLE play_histories DROP CONSTRAINT IF EXISTS "FK_room_play_histories_room";
ALTER TABLE play_histories ALTER COLUMN room_id DROP NOT NULL;
ALTER TABLE play_histories
  ADD CONSTRAINT "FK_play_histories_room"
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;

-- playedBy FK: SET NULL
ALTER TABLE play_histories DROP CONSTRAINT IF EXISTS "FK_play_histories_played_by";
ALTER TABLE play_histories DROP CONSTRAINT IF EXISTS "FK_room_play_histories_played_by";
ALTER TABLE play_histories ALTER COLUMN played_by DROP NOT NULL;
ALTER TABLE play_histories
  ADD CONSTRAINT "FK_play_histories_played_by"
  FOREIGN KEY (played_by) REFERENCES users(id) ON DELETE SET NULL;

-- 메타 스냅샷 컬럼 추가 + 기존 데이터 채우기
ALTER TABLE play_histories ADD COLUMN IF NOT EXISTS provider varchar DEFAULT 'yt';
ALTER TABLE play_histories ADD COLUMN IF NOT EXISTS source_id varchar;
ALTER TABLE play_histories ADD COLUMN IF NOT EXISTS title varchar;
ALTER TABLE play_histories ADD COLUMN IF NOT EXISTS artist varchar;
ALTER TABLE play_histories ADD COLUMN IF NOT EXISTS thumbnail varchar;
ALTER TABLE play_histories ADD COLUMN IF NOT EXISTS duration_ms int DEFAULT 0;

-- 기존 track FK 데이터로 스냅샷 채우기
UPDATE play_histories h
SET
  source_id = t.source_id,
  provider = COALESCE(t.provider, 'yt'),
  title = COALESCE(t.song_title, t.name),
  artist = COALESCE(t.song_artist, t.artist),
  thumbnail = t.thumbnail,
  duration_ms = t.duration_ms
FROM tracks t
WHERE h.track_id = t.id AND h.source_id IS NULL;

-- track FK 제거 (play_histories는 이제 독립)
ALTER TABLE play_histories DROP CONSTRAINT IF EXISTS "FK_play_histories_track";
ALTER TABLE play_histories DROP CONSTRAINT IF EXISTS "FK_room_play_histories_track";
ALTER TABLE play_histories DROP COLUMN IF EXISTS track_id;

-- 인덱스 재생성
DROP INDEX IF EXISTS "IDX_room_play_histories_room_played_at";
CREATE INDEX IF NOT EXISTS "IDX_play_histories_played_at" ON play_histories (played_at);

COMMIT;
