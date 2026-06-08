/**
 * YouTube Innertube API 응답 타입 정의
 *
 * YouTube는 공식 타입을 제공하지 않으므로, 실제 응답에서 사용하는 필드만 정의.
 * 모든 필드는 optional — API 응답 구조가 예고 없이 변경될 수 있음.
 */

// ─── 공통 ───────────────────────────────────────────────

export interface InnertubeTextRun {
  text?: string;
}

export interface InnertubeRuns {
  runs?: InnertubeTextRun[];
}

export interface InnertubeSimpleText {
  simpleText?: string;
}

// ─── videoRenderer (검색 결과 비디오) ────────────────────

export interface InnertubeMetadataBadge {
  metadataBadgeRenderer?: {
    style?: string;
  };
}

export interface InnertubeVideoRenderer {
  videoId?: string;
  title?: InnertubeRuns;
  lengthText?: InnertubeSimpleText;
  ownerText?: InnertubeRuns;
  ownerBadges?: InnertubeMetadataBadge[];
  viewCountText?: InnertubeSimpleText;
}

// ─── lockupViewModel (관련 동영상 / 새 UI) ──────────────

export interface InnertubeTextContent {
  text?: { content?: string };
}

export interface InnertubeMetadataPart {
  text?: { content?: string };
}

export interface InnertubeMetadataRow {
  metadataParts?: InnertubeMetadataPart[];
}

export interface InnertubeThumbnailBadge {
  thumbnailBadgeViewModel?: {
    text?: string;
    icon?: {
      sources?: {
        clientResource?: { imageName?: string };
      }[];
    };
  };
}

export interface InnertubeThumbnailOverlay {
  thumbnailBottomOverlayViewModel?: {
    badges?: InnertubeThumbnailBadge[];
  };
  thumbnailOverlayBadgeViewModel?: {
    thumbnailBadges?: InnertubeThumbnailBadge[];
  };
}

export interface InnertubeLockupViewModel {
  contentId?: string;
  contentImage?: {
    thumbnailViewModel?: {
      overlays?: InnertubeThumbnailOverlay[];
    };
    collectionThumbnailViewModel?: {
      primaryThumbnail?: {
        thumbnailViewModel?: {
          overlays?: InnertubeThumbnailOverlay[];
          image?: {
            sources?: { url?: string }[];
          };
        };
      };
    };
  };
  metadata?: {
    lockupMetadataViewModel?: {
      title?: { content?: string };
      metadata?: {
        contentMetadataViewModel?: {
          metadataRows?: InnertubeMetadataRow[];
        };
      };
    };
  };
}

// ─── playlistRenderer (검색 결과 재생목록) ───────────────

export interface InnertubePlaylistRenderer {
  playlistId?: string;
  title?: InnertubeSimpleText & InnertubeRuns;
  thumbnails?: { thumbnails?: { url?: string }[] }[];
  videoCount?: string;
  shortBylineText?: InnertubeRuns;
}

// ─── 검색 응답 구조 ─────────────────────────────────────

export interface InnertubeSearchItem {
  videoRenderer?: InnertubeVideoRenderer;
  lockupViewModel?: InnertubeLockupViewModel;
  playlistRenderer?: InnertubePlaylistRenderer;
}

export interface InnertubeItemSection {
  itemSectionRenderer?: {
    contents?: InnertubeSearchItem[];
  };
  continuationItemRenderer?: {
    continuationEndpoint?: {
      continuationCommand?: { token?: string };
    };
  };
}

export interface InnertubeSearchData {
  contents?: {
    twoColumnSearchResultsRenderer?: {
      primaryContents?: {
        sectionListRenderer?: {
          contents?: InnertubeItemSection[];
        };
      };
    };
  };
  onResponseReceivedCommands?: {
    appendContinuationItemsAction?: {
      continuationItems?: InnertubeItemSection[];
    };
  }[];
}

// ─── next (관련 동영상) 응답 구조 ────────────────────────

export interface InnertubeNextItem {
  lockupViewModel?: InnertubeLockupViewModel;
  continuationItemRenderer?: {
    continuationEndpoint?: {
      continuationCommand?: { token?: string };
    };
  };
}

export interface InnertubeNextData {
  contents?: {
    twoColumnWatchNextResults?: {
      secondaryResults?: {
        secondaryResults?: {
          results?: InnertubeNextItem[];
        };
      };
    };
  };
  onResponseReceivedEndpoints?: {
    appendContinuationItemsAction?: {
      continuationItems?: InnertubeNextItem[];
    };
  }[];
}

// ─── Music Credits (MWEB next) ──────────────────────────

export interface InnertubeCreditRun {
  text: string;
}

export interface InnertubeCreditMessage {
  runs?: InnertubeCreditRun[];
}

// ─── YouTube Music player (WEB_REMIX) ───────────────────

export interface InnertubeYtMusicPlayerData {
  videoDetails?: {
    title?: string;
    author?: string;
    musicVideoType?: string;
  };
}

// ─── YouTube Music next/browse (WEB_REMIX) ──────────────

export interface InnertubeYtMusicNextData {
  contents?: {
    singleColumnMusicWatchNextResultsRenderer?: {
      tabbedRenderer?: {
        watchNextTabbedResultsRenderer?: {
          tabs?: InnertubeYtMusicTab[];
        };
      };
    };
  };
}

export interface InnertubeYtMusicTab {
  tabRenderer?: {
    title?: string;
    endpoint?: {
      browseEndpoint?: { browseId?: string };
    };
    content?: {
      musicQueueRenderer?: {
        content?: {
          playlistPanelRenderer?: {
            contents?: InnertubeYtMusicPlaylistItem[];
          };
        };
      };
    };
  };
}

export interface InnertubeYtMusicPlaylistItem {
  playlistPanelVideoRenderer?: {
    videoId?: string;
    title?: InnertubeRuns;
    longBylineText?: InnertubeRuns;
    lengthText?: InnertubeRuns;
    thumbnail?: { thumbnails?: { url?: string }[] };
  };
}

export interface InnertubeYtMusicBrowseData {
  contents?: {
    sectionListRenderer?: {
      contents?: InnertubeYtMusicBrowseSection[];
    };
  };
}

export interface InnertubeYtMusicBrowseSection {
  musicCarouselShelfRenderer?: {
    header?: {
      musicCarouselShelfBasicHeaderRenderer?: {
        title?: InnertubeRuns;
      };
    };
    contents?: InnertubeYtMusicCarouselItem[];
  };
}

export interface InnertubeYtMusicCarouselItem {
  musicTwoRowItemRenderer?: {
    title?: InnertubeRuns;
    subtitle?: InnertubeRuns;
    navigationEndpoint?: {
      browseEndpoint?: { browseId?: string };
      watchEndpoint?: { videoId?: string; playlistId?: string };
    };
    thumbnailRenderer?: {
      musicThumbnailRenderer?: {
        thumbnail?: { thumbnails?: { url?: string }[] };
      };
    };
  };
  musicResponsiveListItemRenderer?: {
    flexColumns?: {
      musicResponsiveListItemFlexColumnRenderer?: {
        text?: InnertubeRuns;
      };
    }[];
  };
}

// ─── Request Body ────────────────────────────────────────

export interface InnertubeRequestBody {
  query?: string;
  params?: string;
  continuation?: string;
  videoId?: string;
  browseId?: string;
  isAudioOnly?: boolean;
}
