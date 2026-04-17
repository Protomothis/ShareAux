import type { Metadata } from 'next';

import LegalPageLayout from '@/components/common/LegalPageLayout';

export const metadata: Metadata = { title: 'ShareAux — 개인정보처리방침' };

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="개인정보처리방침" updatedAt="2026년 4월 16일">
      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">1. 수집하는 개인정보</h2>
        <p>ShareAux는 서비스 제공을 위해 아래 정보를 수집합니다.</p>

        <h3 className="font-medium text-white">가. Google 로그인 사용자</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Google 계정 식별자 (고유 ID)</li>
          <li>이메일 주소</li>
          <li>닉네임 (표시 이름)</li>
          <li>프로필 사진 URL</li>
        </ul>
        <p className="text-sa-text-muted">
          위 정보는 Google OAuth 2.0 인증 과정에서 사용자의 동의 하에 제공받으며, ShareAux는 Google 계정 비밀번호에
          접근하지 않습니다.
        </p>

        <h3 className="font-medium text-white">나. 게스트 사용자</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>닉네임 (사용자가 직접 입력)</li>
        </ul>

        <h3 className="font-medium text-white">다. 서비스 이용 과정에서 자동 수집되는 정보</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>방 참여/퇴장 기록</li>
          <li>음악 재생 이력 (곡 제목, 재생 시간)</li>
          <li>채팅 메시지 (방 내 실시간 전송, 서버에 영구 저장하지 않음)</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">2. 수집 목적</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>사용자 인증 및 세션 관리</li>
          <li>방 참여자 식별 및 권한 관리</li>
          <li>음악 재생 통계 및 추천 기능 제공</li>
          <li>서비스 운영 및 개선</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">3. 보유 및 이용 기간</h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-white">
              <th className="py-2 pr-4">구분</th>
              <th className="py-2">보유 기간</th>
            </tr>
          </thead>
          <tbody className="text-sa-text-secondary">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Google 로그인 사용자</td>
              <td className="py-2">서비스 탈퇴(계정 삭제) 요청 시 즉시 파기</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">게스트 사용자</td>
              <td className="py-2">로그아웃 또는 세션 만료 시 즉시 파기</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">채팅 메시지</td>
              <td className="py-2">메모리에서만 유지, 방 종료 시 삭제 (영구 저장 없음)</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">재생 이력</td>
              <td className="py-2">서비스 탈퇴 시 파기</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-lg font-semibold text-white">4. 제3자 제공</h2>
        <p>수집된 개인정보는 제3자에게 제공하지 않습니다.</p>

        <h2 className="text-lg font-semibold text-white">5. Google OAuth 및 외부 서비스</h2>
        <p>ShareAux는 다음 외부 서비스를 사용합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="text-white">Google OAuth 2.0</span> — 사용자 인증. 이메일, 이름, 프로필 사진만 요청하며 그
            외 Google 계정 데이터에 접근하지 않습니다.
          </li>
          <li>
            <span className="text-white">외부 미디어 검색 API</span> — 음악 검색. 사용자의 외부 계정 데이터에 접근하지
            않으며, 공개 검색 기능만 사용합니다.
          </li>
        </ul>
        <p>
          Google 서비스 이용 시{' '}
          <a
            href="https://policies.google.com/privacy"
            className="text-sa-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 개인정보처리방침
          </a>
          이 적용됩니다. 사용자는 언제든{' '}
          <a
            href="https://security.google.com/settings/security/permissions"
            className="text-sa-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 보안 설정
          </a>
          에서 ShareAux의 접근 권한을 철회할 수 있습니다.
        </p>

        <h2 className="text-lg font-semibold text-white">6. 이용자의 권리</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>언제든 계정 삭제를 요청하여 모든 개인정보를 파기할 수 있습니다.</li>
          <li>Google 보안 설정에서 ShareAux의 OAuth 접근 권한을 철회할 수 있습니다.</li>
          <li>수집된 개인정보의 열람, 정정, 삭제를 요청할 수 있습니다.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">7. 셀프호스팅 안내</h2>
        <p>
          ShareAux는 오픈소스 셀프호스팅 소프트웨어입니다. 각 인스턴스의 개인정보 처리는 해당 인스턴스 운영자의 책임
          하에 이루어집니다. 본 방침은 공식 인스턴스에 적용됩니다.
        </p>

        <h2 className="text-lg font-semibold text-white">8. 문의</h2>
        <p>개인정보 관련 문의는 서비스 관리자에게 연락해주세요.</p>
      </section>
    </LegalPageLayout>
  );
}
