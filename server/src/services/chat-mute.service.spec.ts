import { ChatMuteService } from './chat-mute.service.js';

describe('ChatMuteService', () => {
  let service: ChatMuteService;

  beforeEach(() => {
    service = new ChatMuteService();
  });

  it('정상 메시지는 mute 안 됨', () => {
    expect(service.recordAndCheck('room1', 'user1', 'hello')).toBe(0);
    expect(service.isMuted('room1', 'user1')).toBe(0);
  });

  it('같은 메시지 4회 반복 시 mute', () => {
    for (let i = 0; i < 3; i++) {
      service.recordAndCheck('room1', 'user1', 'spam');
    }
    const muteSec = service.recordAndCheck('room1', 'user1', 'spam');
    expect(muteSec).toBeGreaterThan(0);
    expect(service.isMuted('room1', 'user1')).toBeGreaterThan(0);
  });

  it('다른 메시지는 중복 감지 안 됨', () => {
    service.recordAndCheck('room1', 'user1', 'msg1');
    service.recordAndCheck('room1', 'user1', 'msg2');
    service.recordAndCheck('room1', 'user1', 'msg3');
    expect(service.recordAndCheck('room1', 'user1', 'msg4')).toBe(0);
  });

  it('수동 mute/unmute', () => {
    service.manualMute('room1', 'user1', 60);
    expect(service.isMuted('room1', 'user1')).toBeGreaterThan(0);
    service.unmute('room1', 'user1');
    expect(service.isMuted('room1', 'user1')).toBe(0);
  });

  it('getMutes — 방의 mute 목록', () => {
    service.manualMute('room1', 'user1', 60);
    service.manualMute('room1', 'user2', 30);
    service.manualMute('room2', 'user3', 30);
    const mutes = service.getMutes('room1');
    expect(mutes).toHaveLength(2);
    expect(mutes.map((m) => m.userId).sort()).toEqual(['user1', 'user2']);
  });

  it('clearRoom — 방 정리', () => {
    service.manualMute('room1', 'user1', 60);
    service.recordAndCheck('room1', 'user2', 'test');
    service.clearRoom('room1');
    expect(service.isMuted('room1', 'user1')).toBe(0);
    expect(service.getMutes('room1')).toHaveLength(0);
  });

  it('다른 방은 영향 없음', () => {
    service.manualMute('room1', 'user1', 60);
    expect(service.isMuted('room2', 'user1')).toBe(0);
  });
});
