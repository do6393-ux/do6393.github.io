import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvT2aTTuFfu6tQ-PqE4_nkuo9sotAp1cs",
  authDomain: "class-208a0.firebaseapp.com",
  projectId: "class-208a0",
  storageBucket: "class-208a0.firebasestorage.app",
  messagingSenderId: "973163972554",
  appId: "1:973163972554:web:fc295757ef1057fa123133",
  measurementId: "G-2XQC6FVS2P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const unitMeta = {
    'unit1': { name: '1단원. 컴퓨팅 시스템', badgeClass: 'bg-sky-50 text-sky-600 border-sky-200' },
    'unit2': { name: '2단원. 데이터', badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    'unit3': { name: '3단원. 알고리즘과 프로그래밍', badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    'unit4': { name: '4단원. 인공지능', badgeClass: 'bg-purple-50 text-purple-600 border-purple-200' },
    'unit5': { name: '5단원. 디지털 문화', badgeClass: 'bg-amber-50 text-amber-600 border-amber-200' }
};

export let workCatMeta = {
    'devices': { name: '💻 아이스톡 & 계정', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    'network': { name: '🌐 네트워크 & 서버', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    'privacy': { name: '🛡️ 내PC지키미 보안', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
    'software': { name: '🔑 SW & 관리자계정', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    'disposal': { name: '📊 정보공시 & 공문', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' }
};

export const pdfWorkTasksClean = [
    {
        category: 'devices',
        status: 'doing',
        title: '학기초 아이스톡 정비, 티처콜 & 교직원 안내 메시지',
        summary: '아이스톡 관리자 정비, 티처콜 초기화 및 교사 PC 실명 설정 지침',
        content: `### 📌 학기 초 안내 및 정비 지침\n- **아이스톡 관리자 정비:** 아이스톡 로그인 ➔ 더보기 ➔ \`관리자\` 탭 접속하여 정비\n  ![아이스톡 스크린샷](data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="12"/><text x="20" y="35" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231e293b">더보기 | 업무시스템</text><rect x="20" y="55" width="80" height="60" rx="8" fill="%23e0f2fe"/><text x="60" y="90" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%230369a1">화상회의</text><rect x="110" y="55" width="80" height="60" rx="8" fill="%23fef3c7"/><text x="150" y="90" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%23b45309">원격제어</text><rect x="200" y="55" width="80" height="60" rx="8" fill="%23fef3c7"/><text x="240" y="90" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%23b45309">웹팩스</text><rect x="20" y="125" width="80" height="60" rx="8" fill="%23fef9c3" stroke="%23eab308" stroke-width="2"/><text x="60" y="160" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="%23854d0e">관리자(클릭)</text></svg>)\n- **티처콜(TeacherCall) 초기화:** https://teachercall.kr/\n  - **아이디:** \`부원여자중학교\` / **비밀번호:** \`부원2025*\` \n- **홈페이지 관리센터:** ptlmgr.ice.go.krhelpsvc\n  - **아이디:** \`bowongm\` / **비밀번호:** \`5263966\` (연혁, 교직원 소개, 학급회 투표 설정)\n- **교직원 안내 메세지 템플릿:**\n  1. **아이스톡 내 정보 변경:** 상단 사람 아이콘 ➔ 구성원 정보 수정\n  2. **내 PC 이름 바꾸기 (교사 실명):** \`양근숙(O)\`, \`1-7 담임(X)\` ➔ 내 PC ➔ 설정 ➔ 정보 ➔ PC 이름 바꾸기\n  3. **장애 접수:** 교실/개인 PC 문제 발생 시 **후관 2층 정보부실 칠판**에 기재`
    },
    {
        category: 'privacy',
        status: 'doing',
        title: '내PC지키미(AhnLab EPP) 관리자 모니터링 및 월간 점검',
        summary: 'epp.ice.go.kr 관리자 접속, 100점 달성 독려 및 월간 보고서 출력',
        content: `### 🛡️ 내PC지키미 관리자 시스템 매뉴얼\n- **관리자 접속 URL:** https://epp.ice.go.kr:8803/#!/login\n- **관리자 계정:** ID: \`E0777\` / PW: \`1qaz2wsx#\` (부평서여중 코드 기반)\n- **점유율 및 점수 확인:** \`관리\` 탭 ➔ \`PC 보안 점검 정보\` ➔ \`에이전트 보기\` 클릭하여 개인별 점수 확인\n  ![AhnLab EPP 스크린샷](data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150"><rect width="400" height="150" fill="%231e3a8a" rx="10"/><text x="20" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff">AhnLab EPP 관리자 대시보드</text><rect x="20" y="50" width="360" height="80" fill="%23ffffff" rx="6"/><text x="30" y="80" font-family="sans-serif" font-size="12" fill="%231e293b">연계 규칙: PC 보안 점검 정보</text><rect x="250" y="90" width="120" height="30" fill="%230284c7" rx="6"/><text x="310" y="110" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23ffffff" text-anchor="middle">에이전트 보기</text></svg>)\n  - 점수 낮을 경우 100점 맞추도록 메시지 발송\n- **월간 보고서 생성을 위한 메뉴 설정:**\n  ![월간 보고서 설정](data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160"><rect width="400" height="160" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="20" y="25" font-family="sans-serif" font-size="12" font-weight="bold" fill="%230284c7">● 기본 보고서</text><rect x="20" y="35" width="360" height="30" fill="%23ffffff" stroke="%2394a3b8" rx="4"/><text x="30" y="55" font-family="sans-serif" font-size="12" fill="%23334155">PC 보안 점검 정보 ➔ PC 보안 점검 결과 현황</text><rect x="20" y="75" width="15" height="15" fill="%230284c7" rx="3"/><text x="42" y="88" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231e293b">확장 점검 항목 결과 (체크 필수)</text><text x="20" y="125" font-family="sans-serif" font-size="12" fill="%23334155">사용자 정의 기간: [월 단위] ➔ 2024년 1월 ~ 1월 선택 후 [지금 생성]</text></svg>)\n  - \`기본 보고서\` ➔ \`PC 보안 점검 정보\` ➔ \`PC 보안 점검 결과 현황\`\n  - \`확장점검항목결과\` 체크 ➔ \`사용자 정의기간\`에서 월단위 선택 ➔ \`지금 생성\``
    },
    {
        category: 'privacy',
        status: 'todo',
        title: '사이버보안진단의 날 월간 결과 내부결재 기안문',
        summary: '매월 세 번째 수요일 보안 진단 결과 보고서 결재 서식',
        content: `### 📄 내부결재 공문 기안 양식\n- **결재 경로:** 담당자 ➔ 정보부장 ➔ 교감 ➔ 교장 (내부결재)\n- **과제 카드:** 개인정보보호\n- **관련 근거:** 『인천광역시 교육청 정보보안 기본지침』 제10조(사이버보안진단의 날)\n- **붙임 서류 2종:** \n  1. 중점 점검사항 결과 1부\n  2. 사이버보안 진단일지 1부`
    },
    {
        category: 'software',
        status: 'todo',
        title: 'o365 & GCLASS 마이크로소프트/구글 학교 관리자 계정',
        summary: 'o365 교육청 관리자 계정, 기관 코드 및 GCLASS 계정',
        content: `### 🔑 학교 관리자 계정 및 코드 정보\n- **o365 접속 URL:** 인천광역시 교육청 (ice.go.kr)\n- **o365 관리자 계정:** \`SchoolAdmin@bpsg.icems.kr\` / 비밀번호는 변경 관리\n- **o365 교직원/학생 기관 인증 코드:** \`62C2-4A07-F2F9-4CD7-A258\` (무료 프로그램 다운로드)\n- **GCLASS 관리자 계정:** \`bda06-admin@gclass.ice.go.kr\`\n- **나이스 학교코드:** \`E100000777\``
    },
    {
        category: 'network',
        status: 'doing',
        title: '방송 VLC 방화벽 설정 및 학내 서버실 위치 구별',
        summary: 'UDP 방송 연결 시 방화벽 앱 허용 및 전체/단순 서버실 구별',
        content: `### 🌐 방송 수신 및 서버실 구분\n- **방송 VLC 문제 처리:** UDP 사용 시 \`@\` 및 포트번호 확인 ➔ Windows 방화벽 \`앱 허용\` 메뉴에서 VLC 앱 허용 처리\n- **전체 서버실 위치:** 방송실 옆 협의실 (전체 메인 서버실)\n- **단순 서버실 위치:** 후관 2층 정보부실 (단순 서버실)`
    },
    {
        category: 'disposal',
        status: 'todo',
        title: '나이스 정보공시 정시(4월 1차, 5월 2차) 및 수시 등록',
        summary: '부서 권한 부여, 항목별 작성자/확인자 마감 확인 후 총괄 결재',
        content: `### 📊 정보공시 진행 절차 및 메시지 템플릿\n1. 나이스 정보공시 부서에서 항목별 담당자 권한 일괄 부여\n2. **담당자 관리:** 작성자(담당 선생님), 확인자(행정실장님, 교감선생님), 총괄업무 담당자(나) 지정\n  ![나이스 스크린샷](data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150"><rect width="400" height="150" fill="%23f1f5f9" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="20" y="30" font-family="sans-serif" font-size="13" font-weight="bold" fill="%231e293b">나이스 담당자 관리 [정보공시 학교정보공시]</text><rect x="20" y="45" width="360" height="85" fill="%23ffffff" rx="6"/><text x="30" y="70" font-family="sans-serif" font-size="11" fill="%23334155">공시항목 ➔ 작성자 연락처 작성 ➔ 작성자 마감 확인</text><text x="30" y="95" font-family="sans-serif" font-size="11" fill="%23334155">확인자: 행정실장님, 교감선생님 / 총괄업무담당자: 나(신정훈)</text><rect x="200" y="105" width="170" height="20" fill="%230284c7" rx="4"/><text x="285" y="119" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23ffffff" text-anchor="middle">총괄업무담당자 마감 후 결재상신</text></svg>)\n3. **선생님 안내 메시지 템플릿:**\n> "정보공시 2차(5월)와 관련하여 연락드립니다. 쪽지를 받으시는 선생님은 해당 공시 항목 담당자입니다. 첨부해드린 메뉴얼을 참고하셔서 마감 부탁드립니다."\n4. 작성자 마감 ➔ 확인자 마감 확인 ➔ **총괄업무담당자 마감** ➔ 최종 결재 상신 및 전송`
    },
    {
        category: 'disposal',
        status: 'todo',
        title: '교육행정 전자서명 인증서 발급 신청 내부결재',
        summary: '인증서 발급 신청서 작성 및 수신처 지정 기안문',
        content: `### 📄 인증서 신청 공문 작성 서식\n- **공개 범위:** 부분공개, 6호, 자료비공개\n- **결재 경로:** 담당자 ➔ 정보부장 ➔ 교감 ➔ 교장\n- **수신처 지정:** 인천광역시교육감 (정보지원과장)`
    },
    {
        category: 'software',
        status: 'todo',
        title: '나이스 시스템 권한 정비 (PAPS, 보건, 교과우수)',
        summary: '학기말 교과우수 상신용 권한 설정 및 보건 전학년 권한 부여',
        content: `### ⚙️ 나이스 권한 설정 팁\n- **PAPS 및 평가계:** 단위업무별 전과목 또는 전학년 권한 부여\n- **교과우수 상신 권한:** 학기말 교과우수 상신을 위해 단위업무 \`중_수상\`에 1,2,3학년 교과목이 하나 이상 지정되어 있어야함\n- **보건 교사:** 년초(3월) 교무학사(중), 보건 서브시스템 자료권한에서 **전학년** 권한 일괄 부여`
    },
    {
        category: 'privacy',
        status: 'todo',
        title: '청소년 인터넷·스마트폰 이용습관 진단조사 (3월~4월)',
        summary: '3월 가정통신문 배포 후 4월 컴퓨터실 일괄 실시',
        content: `### 📱 이용습관 진단조사 매뉴얼\n- **3월 초중순:** 공문 수신 시 가정통신문 작성 및 배포\n- **4월:** 컴퓨터실 수업 시간을 활용하여 전교생 일괄 진단조사 실시`
    },
    {
        category: 'software',
        status: 'todo',
        title: '에듀테크 플랜 초과분 품의 및 개인정보 보호책임자 지정',
        summary: '에듀테크 해외 결제 수수료 초과분 지출품의서 및 교장 변경 시 재지정',
        content: `### 💳 에듀테크 품의 및 관리\n- **관련 공문:** 부원여자중학교-4092\n- 2024년도 교육활동 지원을 위한 에듀테크 서비스 해외 결제 수수료 초과분 지출품의서 기안\n- 교장 선생님 변경 시 **개인정보 보호책임자 재지정** 공문 상신`
    }
];
