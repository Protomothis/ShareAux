# 기여 가이드

ShareAux에 관심을 가져주셔서 감사합니다.

## 이슈

- **버그 리포트**: 재현 방법, 예상 동작, 실제 동작, 환경 정보를 포함해주세요.
- **기능 요청**: 어떤 문제를 해결하려는지, 제안하는 방법을 설명해주세요.
- AI 코딩 어시스턴트를 사용 중이라면, 관련 코드와 컨텍스트를 AI에게 요약시켜 이슈에 포함하면 원인 파악에 도움이 됩니다.

## Pull Request

1. 이슈를 먼저 생성하여 논의해주세요.
2. `main` 브랜치에서 feature 브랜치를 생성합니다.
3. 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다.
   - `feat:` 새 기능
   - `fix:` 버그 수정
   - `refactor:` 리팩토링
   - `docs:` 문서
4. PR 전에 아래 검증을 통과해야 합니다:
   ```bash
   # 서버
   cd server && npx prettier --write src/ && npx tsc --noEmit

   # 클라이언트
   cd client && npx prettier --write src/ && npx tsc --noEmit
   ```
5. PR 설명에 관련 이슈 번호를 포함해주세요.

## 개발 환경

[개발 가이드](docs/development.md)를 참고하세요.

## 코드 스타일

- TypeScript strict 모드, `any` 사용 금지
- Prettier + ESLint 설정을 따릅니다
- 서버: ESM (`import ... from './foo.js'` — .js 확장자 필수)
- 클라이언트: `components/ui/` shadcn 프리미티브 사용
- 한국어 주석 허용, 식별자는 영어

## 라이선스

기여하신 코드는 프로젝트와 동일한 [MIT 라이선스](LICENSE)로 배포됩니다.
