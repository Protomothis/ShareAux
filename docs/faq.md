[🇰🇷 한국어](./faq.ko.md)

# Frequently Asked Questions (FAQ)

## Playback

### Tracks won't play
- Make sure the media resolver is up to date. Pulling the latest Docker image will auto-update it.
- Check server logs (`docker logs shareaux-server`) for errors.

### No sound on iOS
- HTTPS is required. iOS Safari does not support MediaSource over HTTP.
- Tap the screen once, then press the listen button (browser audio policy).

### Brief interruption when switching tracks
- This is normal. There's a 1–2 second loading time while ffmpeg prepares the next track.
- May take longer on slow networks.

## Configuration

### I don't want to use Google login
- Leave `GOOGLE_CLIENT_ID` empty in `.env` to automatically disable it.

### Lyrics translation isn't working
- Set `GEMINI_API_KEY` in `.env`. You can get a free key from [Google AI Studio](https://aistudio.google.com/).

### I want to allow sign-up without invite codes
- Currently only invite code-based registration is supported. Create an invite code with a high usage limit and share it.

## Deployment

### Does it work behind Cloudflare?
- Yes, but you need to enable WebSocket support (Cloudflare Dashboard → Network → WebSockets: On).
- Pro plan or higher is recommended since connections need to stay alive for 100+ seconds.

### I want to change the ports
- Change port mappings in `docker-compose.yml` (e.g., `'8080:3001'`).
- Also update `CLIENT_URL` in `.env`.

### How do I back up data?
- Back up the PostgreSQL volume (`pgdata`).
- `docker compose exec db pg_dump -U spotiparty spotiparty > backup.sql`

## Troubleshooting

### Server won't start
- Check errors with `docker logs shareaux-server`.
- DB connection failure: Verify `DATABASE_URL` is correct and the DB container is healthy.

### Errors after updating
- DB schema syncs automatically (`synchronize: true`). Most issues resolve with a restart.
- If not, reset DB: `docker compose down -v && docker compose up -d`
- ⚠️ Auto-sync may rarely cause data loss. Back up important data before updating. A safe migration system is planned for the future.

## Usage

### How many people can listen simultaneously?
- Up to 50 per room. Server-wide capacity depends on hardware.
- ~3–5 rooms streaming simultaneously on 1 core / 1GB.

### Is there a track length limit?
- No limit. However, videos over 1 hour may take time for ffmpeg to process.

### How many tracks can be added to the queue?
- Up to 50 per room, up to 10 per user within a time window. Configurable in room settings.

### What is Auto DJ?
- Automatically adds related tracks when the queue is empty. Enable it in room settings.
- Modes: Related tracks / Play history / Popular / Mixed

### What's the difference between guest and regular member?
- Guest: Instant entry with invite code, data deleted on session expiry
- Regular member: Sign up with invite code, permanent account, play history preserved

### Do rooms get automatically deleted?
- When the host leaves and no member has host permissions, the room closes immediately.
- Inactive rooms can be manually cleaned up from the admin page.
