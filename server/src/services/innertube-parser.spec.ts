import {
  parsePlaylistFromLockup,
  parsePlaylistFromRenderer,
  parseRelatedFromLockup,
  parseVideoFromRenderer,
} from './innertube-parser.js';

describe('innertube-parser', () => {
  describe('parseVideoFromRenderer', () => {
    it('정상 비디오 파싱', () => {
      const result = parseVideoFromRenderer({
        videoId: 'dQw4w9WgXcQ',
        title: { runs: [{ text: 'Never Gonna Give You Up' }] },
        lengthText: { simpleText: '3:33' },
        ownerText: { runs: [{ text: 'Rick Astley' }] },
        ownerBadges: [{ metadataBadgeRenderer: { style: 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' } }],
        viewCountText: { simpleText: '1,500,000,000 views' },
      });
      expect(result).toMatchObject({
        id: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        duration: 213,
        isOfficial: true,
        views: 1500000000,
      });
    });

    it('videoId 없으면 null', () => {
      expect(parseVideoFromRenderer({})).toBeNull();
    });

    it('30초 미만 → null', () => {
      expect(
        parseVideoFromRenderer({
          videoId: 'dQw4w9WgXcQ',
          title: { runs: [{ text: 'Short' }] },
          lengthText: { simpleText: '0:15' },
        }),
      ).toBeNull();
    });

    it('15분 초과 → null', () => {
      expect(
        parseVideoFromRenderer({
          videoId: 'dQw4w9WgXcQ',
          title: { runs: [{ text: 'Long' }] },
          lengthText: { simpleText: '16:00' },
        }),
      ).toBeNull();
    });

    it('videoId 11자 아니면 null', () => {
      expect(
        parseVideoFromRenderer({
          videoId: 'short',
          title: { runs: [{ text: 'Test' }] },
          lengthText: { simpleText: '3:00' },
        }),
      ).toBeNull();
    });
  });

  describe('parsePlaylistFromRenderer', () => {
    it('정상 재생목록 파싱', () => {
      const result = parsePlaylistFromRenderer({
        playlistId: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
        title: { simpleText: 'K-Pop Hits' },
        videoCount: '50',
        shortBylineText: { runs: [{ text: 'Music Channel' }] },
      });
      expect(result).toMatchObject({
        playlistId: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
        title: 'K-Pop Hits',
        videoCount: 50,
        channelName: 'Music Channel',
      });
    });

    it('playlistId 없으면 null', () => {
      expect(parsePlaylistFromRenderer({})).toBeNull();
    });
  });

  describe('parseRelatedFromLockup', () => {
    it('PL로 시작하면 null (재생목록)', () => {
      expect(parseRelatedFromLockup({ contentId: 'PLxxxxxxxx' })).toBeNull();
    });

    it('contentId 없으면 null', () => {
      expect(parseRelatedFromLockup({})).toBeNull();
    });
  });

  describe('parsePlaylistFromLockup', () => {
    it('PL로 시작하지 않으면 null', () => {
      expect(parsePlaylistFromLockup({ contentId: 'dQw4w9WgXcQ' })).toBeNull();
    });

    it('제목 없으면 null', () => {
      expect(
        parsePlaylistFromLockup({
          contentId: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
          metadata: { lockupMetadataViewModel: { title: { content: '' } } },
        }),
      ).toBeNull();
    });
  });
});
