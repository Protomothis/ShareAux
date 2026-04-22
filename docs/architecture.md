[🇰🇷 한국어](./architecture.ko.md)

# Architecture

## System Overview

```
Client (Next.js 16)
    │
    ├── HTTP (REST API) ──→ NestJS Server
    │                          │
    ├── WebSocket ←──────────→ RoomsGateway (raw ws)
    │   ├── Binary: Audio frames (fMP4)
    │   ├── JSON: System events, Chat
    │   └── 1 byte: Heartbeat, Reactions
    │
    └── MSE (SourceBuffer) ──→ <audio> playback

NestJS Server
    │
    ├── media resolver ──→ Audio URL extraction
    ├── ffmpeg ──→ fMP4 AAC transcoding
    ├── PostgreSQL ──→ Persistent data
    └── Gemini API ──→ Lyrics translation
```

## Audio Pipeline

The core of ShareAux is real-time audio streaming. Instead of downloading files, the server encodes and simultaneously streams to all clients.

### Flow

```
1. Pick next track from queue
2. Extract audio stream URL via media resolver
3. Transcode to fMP4 AAC with ffmpeg (-re real-time speed)
4. Read chunks from stdout
5. Parse init segment → send to all listeners
6. Subsequent chunks → real-time broadcast
7. Client: append to MSE SourceBuffer → <audio> playback
```

### Key Design Decisions

- **fMP4 (fragmented MP4)**: Container supported by MSE. Allows chunk-by-chunk append
- **AAC codec**: Best browser compatibility (including Safari)
- **`-re` flag**: ffmpeg encodes at real-time speed → uniform chunk delivery
- **Init segment caching**: Enables instant delivery to late joiners
- **Preloading**: Pre-downloads next 3 tracks to minimize track transition delay

### iOS Safari Support

iOS Safari uses `ManagedMediaSource` instead of `MediaSource`.

- `srcObject = ms.handle` (instead of createObjectURL)
- Call `play()` on `startstreaming` event
- User gesture token invalidates after first `await` → call `play()` before async

## WebSocket Protocol

A single WebSocket connection handles all real-time communication. The first byte is an OpCode that identifies the message type.

| OpCode | Name | Direction | Payload |
|--------|------|-----------|---------|
| 0x01 | Audio | S→C | Binary (fMP4 chunk) |
| 0x02 | Chat | Bidirectional | JSON (message) |
| 0x03 | System | S→C | JSON (event) |
| 0x04 | Heartbeat | C→S | None |
| 0x05 | Resync | C→S | None (re-request init segment) |
| 0x06 | ListenerStatus | C→S | 1 byte (0=off, 1=on) |
| 0x07 | Reaction | C→S | 1 byte (reaction index) |
| 0x08 | PingMeasure | Bidirectional | 8-byte Float64 (RTT measurement) |

### Connection Management

- **Heartbeat**: Client 30s, Server 60s timeout
- **Reconnection**: Exponential backoff (1s → 2s → 4s...)
- **Duplicate sessions**: Previous connection closed when joining same room again (4007)
- **One room per user**: Previous room connection closed when joining another room (4008)
- **Token expiry**: Auto refresh then reconnect

## Permission System

Two-tier permission model:

```
Effective Permission = Account Permission ∩ Room Permission
```

- **Account permissions**: Set when creating invite code. Permanently applied to account
- **Room permissions**: Host sets per-user permissions within a room
- **Effective permissions**: Intersection of both. If blocked at account level, room cannot override

### Permission List

| Permission | Description |
|------------|-------------|
| listen | Listen to music (default, cannot be disabled) |
| chat | Chat |
| reaction | Reactions |
| search | Search music |
| addQueue | Add tracks to queue |
| reorder | Reorder queue |
| voteSkip | Vote skip |
| kick | Kick other users |
| createRoom | Create rooms |

## Lyrics System

### Search Priority

1. **syncedlyrics (Musixmatch)** — Word-level karaoke (Enhanced LRC)
2. **External service auto-captions** — Converted to line-level LRC
3. **syncedlyrics (general)** — Line-level LRC

### Translation Pipeline

```
Lyrics found → Language detection → Gemini API call
  ├── Japanese: Korean translation + romanization (single call)
  ├── English/Chinese: Korean translation only
  └── Korean: No translation needed (skip)
```

- Sequential processing via in-memory queue
- Daily call limit (default 200)
- Notifies client via WebSocket on completion → auto refresh

## Database

TypeORM + PostgreSQL. `synchronize: true` for automatic schema sync (development).

### Main Entities

| Entity | Description |
|--------|-------------|
| User | Users (Google/local) |
| Room | Room settings and state |
| RoomMember | Room participants |
| RoomPermission | Per-user room permissions |
| RoomQueue | Playback queue |
| RoomPlayback | Current playback state |
| Track | Track metadata + lyrics |
| InviteCode | Invite codes |

## Client State Management

| Type | Tool | Examples |
|------|------|----------|
| Server state | react-query | Room list, user info, queue |
| Client state | zustand | Auth tokens, UI state |
| Real-time state | useState + WebSocket | Playback state, chat, members |
| Audio | useRef + MSE | SourceBuffer, AudioContext |
