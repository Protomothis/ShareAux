import type { IncomingMessage } from 'http';
import type { Socket } from 'net';

import { WsAuthService } from './ws-auth.service.js';

describe('WsAuthService', () => {
  let service: WsAuthService;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let ipBanService: Record<string, jest.Mock>;

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'CLIENT_URL') return 'https://app.example.com';
        // DEV_WS_ORIGIN_CHECK=true → origin 검증 활성화 (테스트에서 검증하기 위해)
        if (key === 'DEV_WS_ORIGIN_CHECK') return 'true';
        return undefined;
      }),
    };
    ipBanService = { isIpBanned: jest.fn().mockReturnValue(false), banIp: jest.fn().mockResolvedValue(undefined) };

    service = new WsAuthService(jwtService as never, configService as never, ipBanService as never);
  });

  function makeReq(overrides: Partial<{ headers: Record<string, string>; url: string; remoteAddress: string }>): IncomingMessage {
    return {
      headers: overrides.headers ?? {},
      url: overrides.url ?? '/ws?roomId=room-1',
      socket: { remoteAddress: overrides.remoteAddress ?? '127.0.0.1' } as Socket,
    } as unknown as IncomingMessage;
  }

  describe('checkUpgrade', () => {
    it('허용된 Origin 통과', () => {
      const req = makeReq({ headers: { origin: 'https://app.example.com' } });
      const result = service.checkUpgrade(req);
      expect(result.allowed).toBe(true);
    });

    it('차단된 Origin 거부', () => {
      const req = makeReq({ headers: { origin: 'https://evil.com' } });
      const result = service.checkUpgrade(req);
      expect(result.allowed).toBe(false);
    });

    it('Origin 없으면 통과 (서버-투-서버)', () => {
      const req = makeReq({ headers: {} });
      const result = service.checkUpgrade(req);
      expect(result.allowed).toBe(true);
    });

    it('IP 추출 — x-forwarded-for 우선', () => {
      const req = makeReq({
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8', origin: 'https://app.example.com' },
      });
      const result = service.checkUpgrade(req);
      expect(result.ip).toBe('1.2.3.4');
    });

    it('IP 추출 — remoteAddress fallback', () => {
      const req = makeReq({ headers: { origin: 'https://app.example.com' }, remoteAddress: '10.0.0.1' });
      const result = service.checkUpgrade(req);
      expect(result.ip).toBe('10.0.0.1');
    });

    it('IP ban 체크', () => {
      ipBanService.isIpBanned.mockReturnValue(true);
      const req = makeReq({ headers: { origin: 'https://app.example.com' } });
      const result = service.checkUpgrade(req);
      expect(result.allowed).toBe(false);
    });

    it('rate limit 초과 시 거부 (쿠키 없는 요청)', () => {
      const req = makeReq({ headers: { origin: 'https://app.example.com' } });
      // WS_RATE_LIMIT = 10, 11번째에서 거부
      for (let i = 0; i < 10; i++) service.checkUpgrade(req);
      const result = service.checkUpgrade(req);
      expect(result.allowed).toBe(false);
    });
  });

  describe('authenticate', () => {
    it('유효한 JWT — 쿠키', () => {
      const payload = { sub: 'user-1', email: 'a@b.com', nickname: 'Test' };
      jwtService.verify.mockReturnValue(payload);
      const req = makeReq({
        headers: { cookie: 'sat=valid-token; other=x' },
        url: '/ws?roomId=room-1',
      });
      const result = service.authenticate(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.sub).toBe('user-1');
        expect(result.roomId).toBe('room-1');
        expect(result.token).toBe('valid-token');
      }
    });

    it('유효한 JWT — 쿼리 토큰', () => {
      const payload = { sub: 'user-2', email: 'b@c.com' };
      jwtService.verify.mockReturnValue(payload);
      const req = makeReq({ url: '/ws?roomId=room-2&token=query-token' });
      const result = service.authenticate(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.token).toBe('query-token');
        expect(result.roomId).toBe('room-2');
      }
    });

    it('쿠키가 쿼리 토큰보다 우선', () => {
      jwtService.verify.mockReturnValue({ sub: 'u', email: 'e' });
      const req = makeReq({
        headers: { cookie: 'sat=cookie-token' },
        url: '/ws?roomId=room-1&token=query-token',
      });
      const result = service.authenticate(req);
      if (result.ok) expect(result.token).toBe('cookie-token');
    });

    it('만료된 JWT', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });
      const req = makeReq({ headers: { cookie: 'sat=expired' }, url: '/ws?roomId=room-1' });
      const result = service.authenticate(req);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('Invalid token');
    });

    it('잘못된 토큰', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      const req = makeReq({ headers: { cookie: 'sat=bad' }, url: '/ws?roomId=room-1' });
      const result = service.authenticate(req);
      expect(result.ok).toBe(false);
    });

    it('토큰 없으면 실패', () => {
      const req = makeReq({ url: '/ws?roomId=room-1' });
      const result = service.authenticate(req);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('Missing token or roomId');
    });

    it('roomId 없으면 실패', () => {
      const req = makeReq({ headers: { cookie: 'sat=token' }, url: '/ws' });
      const result = service.authenticate(req);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('Missing token or roomId');
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('만료된 항목 정리', () => {
      // 먼저 rate limit 엔트리를 생성
      const req = makeReq({ headers: { origin: 'https://app.example.com' }, remoteAddress: '1.1.1.1' });
      service.checkUpgrade(req);

      // 시간을 앞으로 돌리면 만료됨
      jest.useFakeTimers();
      jest.advanceTimersByTime(15_000); // WS_RATE_WINDOW_MS = 10_000
      service.cleanupExpiredEntries();
      jest.useRealTimers();

      // 다시 접속 시도 — 이전 카운트 없이 통과
      const result = service.checkUpgrade(req);
      expect(result.allowed).toBe(true);
    });

    it('만료 안 된 항목은 유지', () => {
      jest.useFakeTimers();
      const req = makeReq({ headers: { origin: 'https://app.example.com' }, remoteAddress: '2.2.2.2' });

      // 10번 시도 (limit까지)
      for (let i = 0; i < 10; i++) service.checkUpgrade(req);

      jest.advanceTimersByTime(5_000); // 아직 10초 안 지남
      service.cleanupExpiredEntries();

      // 다음 시도는 거부 (카운트 유지)
      const result = service.checkUpgrade(req);
      expect(result.allowed).toBe(false);
      jest.useRealTimers();
    });
  });
});
