import Link from 'next/link';

import type { Metadata } from 'next';

import LegalPageLayout from '@/components/common/LegalPageLayout';

export const metadata: Metadata = { title: 'ShareAux — 이용약관' };

export default function TermsPage() {
  return (
    <LegalPageLayout title="이용약관" updatedAt="2026년 4월 16일">
      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">1. 서비스 개요</h2>
        <p>
          ShareAux는 실시간 음악 공유 플랫폼으로, 사용자가 방을 만들어 음악을 함께 검색하고 실시간으로 스트리밍할 수
          있는 셀프호스팅 서비스입니다.
        </p>

        <h2 className="text-lg font-semibold text-white">2. 이용 자격</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Google 계정 또는 게스트 닉네임으로 서비스를 이용할 수 있습니다.</li>
          <li>게스트 계정은 초대 코드가 필요할 수 있으며, 기능이 제한될 수 있습니다.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">3. 이용자의 의무</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>타인에게 불쾌감을 주는 채팅, 닉네임 사용을 금지합니다.</li>
          <li>서비스의 정상적인 운영을 방해하는 행위를 금지합니다.</li>
          <li>자동화 도구를 이용한 대량 요청, 크롤링 등을 금지합니다.</li>
          <li>방 호스트의 운영 방침을 존중해야 합니다.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">4. 서비스 제공 및 제한</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>서비스는 현재 상태 그대로(&quot;as-is&quot;) 제공되며, 가용성을 보장하지 않습니다.</li>
          <li>운영자는 서비스 점검, 업데이트 등의 사유로 서비스를 일시 중단할 수 있습니다.</li>
          <li>이용 규칙을 위반한 사용자는 경고 없이 이용이 제한(추방, IP 차단)될 수 있습니다.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">5. 콘텐츠 및 저작권</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>ShareAux는 음악 파일을 저장하지 않으며, 외부 미디어 서비스를 통해 실시간 스트리밍합니다.</li>
          <li>음악의 저작권은 해당 권리자에게 있으며, ShareAux는 개인적·비상업적 용도의 스트리밍만 지원합니다.</li>
          <li>가사 데이터는 외부 서비스에서 제공받으며, 해당 서비스의 이용 조건이 적용됩니다.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">6. 계정 및 탈퇴</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Google 로그인 사용자는 관리자에게 계정 삭제를 요청할 수 있으며, 요청 시 모든 데이터가 즉시 파기됩니다.
          </li>
          <li>게스트 계정은 로그아웃 또는 세션 만료 시 자동으로 삭제됩니다.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">7. 프로젝트 성격</h2>
        <p>
          ShareAux는 <span className="text-white">교육 및 포트폴리오 목적</span>으로 개발된 오픈소스 프로젝트입니다.
          실시간 오디오 스트리밍, WebSocket 통신, MSE(Media Source Extensions) 등 웹 기술의 학습과 시연을 위해
          제작되었으며, 상업적 음악 스트리밍 서비스가 아닙니다.
        </p>

        <h2 className="text-lg font-semibold text-white">8. 면책 조항</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            ShareAux는 현재 상태 그대로 제공되며, 서비스 이용으로 인한 직접적·간접적 손해에 대해 책임지지 않습니다.
          </li>
          <li>외부 서비스(Google 등) 장애로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
          <li>
            <span className="text-white">저작권 관련 책임</span>: ShareAux 소프트웨어 자체는 음악 파일을 저장하거나
            배포하지 않습니다. 셀프호스팅 환경에서의 콘텐츠 이용에 대한 저작권법 준수 여부는{' '}
            <span className="text-white">해당 인스턴스 운영자의 책임</span>입니다. 프로젝트 개발자는 제3자가 운영하는
            인스턴스에서 발생하는 저작권 침해에 대해 책임지지 않습니다.
          </li>
          <li>
            <span className="text-white">상업적 이용 금지</span>: 본 소프트웨어를 이용한 대규모 상업적 음악 스트리밍
            서비스 운영은 의도된 사용 범위를 벗어나며, 이로 인해 발생하는 법적 문제에 대해 프로젝트 개발자는 일체의
            책임을 지지 않습니다.
          </li>
          <li>본 소프트웨어는 개인적·비상업적·교육적 용도의 소규모 사용을 전제로 설계되었습니다.</li>
          <li>
            <span className="text-white">비공개 운영 권장</span>: 불특정 다수에게 공개하는 형태의 서비스 운영을
            지양하며, 초대 코드를 통한 비공개·개인적 사용을 강력히 권장합니다.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-white">9. 보안</h2>
        <p>ShareAux는 다음과 같은 보안 조치를 적용하고 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>JWT 기반 인증 및 세션 관리</li>
          <li>비밀번호 bcrypt 해싱 (방 비밀번호)</li>
          <li>API 요청 속도 제한 (ThrottlerGuard)</li>
          <li>IP 차단 시스템</li>
          <li>PoW(Proof of Work) 기반 CAPTCHA</li>
          <li>Helmet 보안 헤더 적용</li>
          <li>입력값 검증 (class-validator, whitelist 필터링)</li>
          <li>CORS 정책 적용</li>
        </ul>
        <p className="mt-2">
          위 조치에도 불구하고, ShareAux는 소스 코드가 공개된 오픈소스 프로젝트이므로 코드 분석을 통한 취약점 발견 및
          악용 시도가 있을 수 있습니다. 셀프호스팅 운영자는 자체 환경에 맞는{' '}
          <span className="text-white">추가적인 보안 강화 조치</span>(방화벽 설정, 접근 제어, 정기 업데이트 등)를 적용할
          것을 권장하며, 보안 사고 발생 시 프로젝트 개발자는 책임을 지지 않습니다.
        </p>

        <h2 className="text-lg font-semibold text-white">10. 약관 변경</h2>
        <p>본 약관은 서비스 운영 필요에 따라 변경될 수 있으며, 변경 시 서비스 내 공지합니다.</p>

        <h2 className="text-lg font-semibold text-white">11. 문의</h2>
        <p>이용약관 관련 문의는 서비스 관리자에게 연락해주세요.</p>
      </section>
    </LegalPageLayout>
  );
}
