[🇰🇷 한국어](./features.ko.md)

# Feature Details

## Room System

### Creating a Room

When creating a room, you can configure:

- **Room name**: Displayed in the room list
- **Private**: Set a password to require it on entry
- **Max members**: Maximum simultaneous participants
- **Crossfade**: Fade effect on track transitions
- **Auto DJ**: Automatically adds tracks when queue is empty
  - Modes: Popular / Random / Similar tracks
  - Trigger threshold: Based on remaining tracks in queue
- **Default permissions**: Whether new participants can add to queue, vote skip, etc.

### Joining a Room

- Click a room in the room list to join
- Private rooms require password entry
- Direct entry via invite link supported
- One room per user — joining another room auto-leaves the previous one

### Host (DJ)

The room creator becomes the host. The host has these permissions:

- Skip / previous track
- Reorder queue
- Set individual participant permissions
- Transfer DJ role
- Kick participants
- Change room settings

When the host leaves, the role is automatically transferred to a remaining participant.

---

## Music Playback

### Track Search

Two ways to find tracks in the search modal:

- **Search tab**: Search by keyword. Autocomplete suggestions supported
- **Showcase tab**: Category-based recommendations — popular, recently played, most liked, etc.

Multiple tracks can be selected and added to the queue at once.

### Queue Management

- Drag and drop to reorder (host or authorized users)
- Remove tracks (own tracks or host)
- Current playing track indicator
- Next track preloading (minimizes transition delay)

### Vote Skip

Non-host participants can skip tracks by voting.

- Skips when majority of participants vote
- Cannot vote within a certain time (5s) after track starts
- Host can skip immediately

### Auto DJ

Automatically adds tracks when the queue is empty.

- Enable/disable in room settings
- Modes: Popular-based / Random / Similar to current track
- Auto-disables on consecutive failures (notified via system message)

---

## Lyrics

### Synced Lyrics

Displays lyrics in real-time for the currently playing track.

- **Line-level sync**: Highlights the current lyric line matching playback position
- **Word-level karaoke**: Gradient highlight per word (for Enhanced LRC tracks)
- Spring physics-based scroll animation
- Distance-based opacity/scale for focus effect

### Translation

Automatically translates Japanese, English, and Chinese lyrics to Korean.

- Gemini AI-powered translation
- Japanese tracks: Korean romanization guide included
- Real-time WebSocket notification on completion → auto refresh
- Korean lyrics skip translation

### Sync Adjustment

Manually adjust lyrics timing offset when out of sync.

- ±100ms increments
- Applied independently per track

---

## Chat & Reactions

### Real-time Chat

Real-time chat between room participants.

- WebSocket-based instant delivery
- Last 50 messages history (restored on reconnect)
- Spam prevention: Auto-detection with temporary mute
- Admins/hosts are exempt from mute

### Reactions

Express emotions with floating emoji reactions.

- Real-time broadcast to entire room
- Animated floating effect on screen

---

## Permission System

Two-tier permission model for fine-grained access control.

### Account Permissions

Set when creating an invite code. Permanently applied to users who sign up/enter with that code.

### Room Permissions

Host sets per-user permissions within a room. Tap a user in the member list to open the permission modal.

### Effective Permissions

```
Effective Permission = Account Permission ∩ Room Permission
```

Permissions restricted at account level cannot be overridden at room level.

### Permission List

| Permission | Description | Default |
|------------|-------------|---------|
| Listen | Receive audio stream | Always on |
| Chat | Send chat messages | On |
| Reaction | Send emoji reactions | On |
| Search | Search tracks | On |
| Add Queue | Add tracks to queue | On |
| Reorder | Drag and drop queue | Off |
| Vote Skip | Participate in skip votes | On |
| Kick | Kick other users | Off |
| Create Room | Create new rooms | On |

---

## Guest System

### Invite Codes

Admins create invite codes to invite guests.

- Auto-generated or custom code
- Max usage count
- Expiration date (optional)
- Per-code account permissions
- Registration allowed toggle

### Guest Entry

- Enter with invite code + nickname only
- Instant participation without account creation
- Auto-deleted on session expiry (no personal data retained)

### Registration

If registration is allowed on the invite code, guests can create a permanent account. Permissions set on the invite code are applied to the account.

---

## Admin Back Office

Admin-only pages accessible at `/admin`.

### Dashboard

- Real-time connected users graph (time series, incremental updates)
- Server resource monitoring (CPU, memory, ffmpeg processes)
- Daily playback statistics
- User distribution (by role, sign-up method)

### User Management

- User list (filter by role/sign-up method/status)
- User detail: Profile, permissions, activity history
- Role changes, account deactivation

### Room Management

- Active room list + real-time streaming status
- Room detail: Settings, members, play history

### Track Management

- Track rankings (play count, likes, score)
- Track detail: Metadata, statistics, votes

### Invite Code Management

- Code list, usage status
- Create/delete codes

### System Settings

- Translation settings (enable, daily limit, model)
- Other system settings

### DB Cleanup

- Clean up inactive rooms, old play history, expired invite codes, etc.
- Selective cleanup by category

### Audit Logs

- Admin action history timeline

### IP Bans

- IP ban list management
- Banned IPs are immediately rejected by middleware

### Error Logs

- In-memory error log (last 500 entries)
- File error log (JSONL, 20MB rotation)

---

## Security

- JWT authentication + cookie refresh tokens
- Password bcrypt hashing
- API rate limiting (ThrottlerGuard, separate limits for admin API)
- PoW (Proof of Work) CAPTCHA
- Helmet security headers
- Input validation (class-validator, whitelist filtering)
- CORS policy
- IP ban middleware

---

## Mobile Support

- `fixed inset-0` app shell (iOS Safari address bar handling)
- Modal fullscreen mode (`fullscreenMobile`)
- `touch-manipulation` touch optimization
- `overscroll-behavior: none` scroll bounce prevention
- `pagehide` + `sendBeacon` leave detection (iOS Safari compatible)
- ManagedMediaSource support (iOS Safari MSE)
