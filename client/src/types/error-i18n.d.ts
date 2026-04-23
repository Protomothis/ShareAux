import type { ErrorCode } from '@/api/model';

/**
 * ErrorCode enum의 모든 값이 errorTitle/errorDesc 네임스페이스에 존재하는지 빌드 타임 체크.
 * 서버에 에러 코드 추가 시 messages JSON에도 키를 추가하지 않으면 tsc 에러 발생.
 */
type Messages = typeof import('../../messages/ko.d.json.ts').default;

type _AssertTitles = {
  [K in ErrorCode]: K extends keyof Messages['errorTitle'] ? true : `Missing errorTitle key: ${K}`;
};

type _AssertDescs = {
  [K in ErrorCode]: K extends keyof Messages['errorDesc'] ? true : `Missing errorDesc key: ${K}`;
};

// 이 줄이 에러 없이 통과하면 모든 ErrorCode가 JSON에 존재
export type ErrorI18nComplete = _AssertTitles & _AssertDescs;
