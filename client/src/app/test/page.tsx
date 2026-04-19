import { Provider } from '@/api/model';
('use client');

import { useCallback, useRef, useState } from 'react';

import type { Track } from '@/api/model';
import { playerControllerPlay } from '@/api/player/player';
import { queueControllerAddTracks, queueControllerGetQueue } from '@/api/queue/queue';
import { roomsControllerCreate } from '@/api/rooms/rooms';
import { searchControllerSearch } from '@/api/search/search';
import { useAudio } from '@/hooks/useAudio';

const MSG_AUDIO = 0x01;
const MSG_CHAT = 0x02;
const MSG_SYSTEM = 0x03;

export default function TestPage() {
  const [token, setToken] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('test-room');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [audioFrames, setAudioFrames] = useState(0);
  const [listening, setListening] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audio = useAudio();

  const addLog = useCallback((msg: string) => {
    setLog((p) => [...p.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const applyToken = () => {
    if (!token) return;
    localStorage.setItem('accessToken', token);
    addLog('토큰 저장됨');
  };

  const createRoom = async () => {
    try {
      const room = await roomsControllerCreate({ name: roomName });
      setRoomId(room.id);
      addLog(`방 생성: ${room.id}`);
    } catch (e) {
      addLog(`방 생성 실패: ${e}`);
    }
  };

  const search = async () => {
    try {
      const r = await searchControllerSearch({ q: query });
      setResults(r.tracks);
      addLog(`검색 결과: ${r.tracks.length}곡`);
    } catch (e) {
      addLog(`검색 실패: ${e}`);
    }
  };

  const enqueue = async (trackId: string) => {
    if (!roomId) return addLog('roomId 없음');
    try {
      await queueControllerAddTracks(roomId, { items: [{ provider: Provider.YT, sourceId: trackId }] });
      addLog(`대기열 추가: ${trackId}`);
    } catch (e) {
      addLog(`대기열 추가 실패: ${e}`);
    }
  };

  const play = async () => {
    if (!roomId) return addLog('roomId 없음');
    try {
      const q = await queueControllerGetQueue(roomId);
      if (!q.length) return addLog('대기열 비어있음');
      await playerControllerPlay(roomId, { trackId: q[0].track.id });
      addLog('재생 시작');
    } catch (e) {
      addLog(`재생 실패: ${e}`);
    }
  };

  const connectWs = () => {
    if (!roomId) return addLog('roomId 없음');
    const t = token || localStorage.getItem('accessToken') || '';
    const url = `ws://localhost:3000/ws?token=${t}&roomId=${roomId}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => addLog('WS 연결됨');
    ws.onclose = () => addLog('WS 닫힘');
    ws.onerror = () => addLog('WS 에러');
    ws.onmessage = (e) => {
      if (!(e.data instanceof ArrayBuffer) || e.data.byteLength < 2) return;
      const bytes = new Uint8Array(e.data);
      const type = bytes[0];
      const payload = bytes.slice(1);

      if (type === MSG_AUDIO) {
        setAudioFrames((n) => n + 1);
        if (listening) audio.pushFrame(payload);
      } else {
        try {
          const json = JSON.parse(new TextDecoder().decode(payload));
          if (type === MSG_CHAT) addLog(`채팅: ${json.nickname}: ${json.message}`);
          else if (type === MSG_SYSTEM) addLog(`시스템: ${json.event} - ${json.detail}`);
        } catch {
          /* ignore */
        }
      }
    };
  };

  const startListening = async () => {
    await audio.init();
    setListening(true);
    addLog('오디오 재생 시작');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-4 font-mono text-sm">
      <h1 className="text-lg font-bold">E2E Test</h1>

      <div className="flex gap-2">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="JWT 토큰"
          className="flex-1 bg-gray-800 px-2 py-1 rounded"
        />
        <button onClick={applyToken} className="bg-blue-600 px-3 py-1 rounded">
          토큰 저장
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="방 이름"
          className="bg-gray-800 px-2 py-1 rounded"
        />
        <button onClick={createRoom} className="bg-green-600 px-3 py-1 rounded">
          방 생성
        </button>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
          className="bg-gray-800 px-2 py-1 rounded w-48"
        />
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어"
          className="flex-1 bg-gray-800 px-2 py-1 rounded"
        />
        <button onClick={search} className="bg-purple-600 px-3 py-1 rounded">
          검색
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {results.map((t) => (
            <div key={t.id} className="flex justify-between items-center bg-gray-800 px-2 py-1 rounded">
              <span>
                {t.name} - {t.artist}
              </span>
              <button onClick={() => enqueue(t.id)} className="bg-yellow-600 px-2 rounded text-xs">
                추가
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={play} className="bg-green-600 px-3 py-1 rounded">
          재생
        </button>
        <button onClick={connectWs} className="bg-blue-600 px-3 py-1 rounded">
          WS 연결
        </button>
        <button onClick={startListening} className="bg-pink-600 px-3 py-1 rounded">
          음악 듣기
        </button>
        <span className="py-1">오디오 프레임: {audioFrames}</span>
      </div>

      <div className="bg-gray-800 rounded p-2 h-60 overflow-y-auto">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
