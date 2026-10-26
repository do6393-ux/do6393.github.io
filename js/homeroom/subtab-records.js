import { db, doc, getDoc, setDoc } from '../firebase-config.js';
import { homeroomState } from './state.js';

// 1. 나이스 규격 검증 및 금지어 필터
export const NEIS_RULES = {
    calculateBytes(text) {
        if (!text) return 0;
        let bytes = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            const code = text.charCodeAt(i);
            if (char === '\n') bytes += 2;
            else if (code <= 0x007f) bytes += 1;
            else bytes += 3;
        }
        return bytes;
    },
    forbiddenWords: [
        '토익', '토플', '텝스', '토셀', '한자시험', '한국어능력시험',
        '올림피아드', '경시대회', '대회', '수상', '입상', '상장',
        '자격증', '인증', '영재교육원', '영재학급', '논문', '학회지',
        '도서출판', '사설', '학원', '과외', '인강', '어학연수',
        '부모', '아버지', '어머니', '교수', '의사', '대표'
    ],
    checkForbiddenWords(text) {
        if (!text) return [];
        return this.forbiddenWords.filter(word => text.includes(word));
    }
};

// 2. 한글 조사 및 어미 자동 변환기
export const KoreanGrammar = {
    hasBatchim(word) {
        if (!word) return false;
        const clean = word.trim();
        const lastChar = clean.charAt(clean.length - 1);
        const code = lastChar.charCodeAt(0);
        if (code < 0xAC00 || code > 0xD7A3) return false;
        return (code - 0xAC00) % 28 > 0;
    },
    attach(word, type) {
        if (!word) return "";
        const clean = word.trim();
        const batchim = this.hasBatchim(clean);
        switch (type) {
            case '을를': return clean + (batchim ? '을' : '를');
            case '은는': return clean + (batchim ? '은' : '는');
            case '이가': return clean + (batchim ? '이' : '가');
            case '과와': return clean + (batchim ? '과' : '와');
            case '으로로': return clean + (batchim ? '으로' : '로');
            default: return clean;
        }
    },
    attachSituationJosa(situationText) {
        if (!situationText) return "";
        const clean = situationText.trim();
        if (clean.endsWith('에') || clean.endsWith('에서') || clean.endsWith('시') || clean.endsWith('때') || clean.endsWith('로서') || clean.endsWith('로')) return clean;
        if (clean.endsWith('도우미') || clean.endsWith('지킴이') || clean.endsWith('담당자') || clean.endsWith('회장') || clean.endsWith('부회장') || clean.endsWith('부원')) return `${clean}로서`;
        if (clean.endsWith('시간')) return `${clean}에`;
        if (clean.endsWith('활동') || clean.endsWith('수업') || clean.endsWith('회의') || clean.endsWith('과정')) return `${clean}에서`;
        if (clean.endsWith('상황') || clean.endsWith('경우')) return `${clean}에서`;
        return `${clean} 시,`;
    },
    formatActionConnective(actionText) {
        if (!actionText) return "";
        let text = actionText.trim().replace(/\.+$/, '');
        const verbMap = [
            { from: /자원함$/, to: '자원하여 솔선하고' },
            { from: /도와줌$/, to: '따뜻하게 도와주며' },
            { from: /챙김$/, to: '세심하게 챙길 줄 알며' },
            { from: /동행함$/, to: '기꺼이 동행해 주며' },
            { from: /경청함$/, to: '성심껏 경청하고' },
            { from: /청소함$/, to: '야무지고 깔끔하게 청소하며' },
            { from: /관리함$/, to: '철저히 관리하여' },
            { from: /수거함$/, to: '책임감 있게 수거하여' },
            { from: /단속함$/, to: '철저히 확인하여' },
            { from: /완수함$/, to: '묵묵히 끝까지 마무리하고' },
            { from: /노력함$/, to: '개선하고자 부단히 노력하며' },
            { from: /소통함$/, to: '원활하게 소통하며' },
            { from: /필기함$/, to: '정자로 또박또박 필기하며' },
            { from: /참여함$/, to: '적극적으로 참여하며' },
            { from: /해결함$/, to: '합리적으로 해결해 내며' },
            { from: /실천함$/, to: '꾸준히 실천하여' },
            { from: /배움$/, to: '배우게 되었으며' },
            { from: /비워냄$/, to: '적절한 시기에 비워내며' },
            { from: /안내함$/, to: '친절하게 안내하고' },
            { from: /세척함$/, to: '깨끗이 세척하며' },
            { from: /점검함$/, to: '꼼꼼하게 점검하고' },
            { from: /지원함$/, to: '원활하게 지원하며' },
            { from: /정돈함$/, to: '항상 제자리에 정돈하고' }
        ];
        for (const item of verbMap) {
            if (item.from.test(text)) return text.replace(item.from, item.to);
        }
        if (text.endsWith('함')) return text.replace(/함$/, '하고');
        if (text.endsWith('음') || text.endsWith('슴')) return text.replace(/[음슴]$/, '으며');
        if (!text.endsWith('고') && !text.endsWith('며') && !text.endsWith('하여')) return `${text}하며`;
        return text;
    },
    joinTraits(traits) {
        if (!traits || traits.length === 0) return "";
        if (traits.length === 1) return traits[0].trim();
        let result = traits[0].trim();
        for (let i = 1; i < traits.length; i++) {
            result = `${this.attach(result, '과와')} ${traits[i].trim()}`;
        }
        return result;
    }
};

// 3. 확장된 12대 프리셋 (기존 7개 영역 + 독립 5대 도우미 영역)
export const DEFAULT_BEHAVIOR_PRESETS = {
    conflictResolution: {
        category: "갈등 해결 및 대화·관계 회복",
        situations: [
            "학기 초 자신의 주장을 앞세워 친구들과 잦은 마찰을 겪었으나",
            "직설적인 표현과 강한 자존심으로 교우 간 오해가 발생했을 때",
            "모둠 활동 및 조별 과제 중 역할 분담에 대한 이견으로 분위기가 경직되었을 때",
            "사소한 장난이나 의견 차이로 친구와 서먹해지고 다툼이 일어났을 때"
        ],
        actions: [
            "자신의 고집을 내려놓고 친구의 입장을 먼저 경청하며 대화를 통해 타협점을 찾으려 노력함",
            "직접 대면 시 쑥스러워도 전화나 문자로 자신의 잘못을 솔직하게 인정하고 사과를 건넴",
            "자신의 잘못을 뉘우치고 올바른 언어 습관을 가지기 위해 노력하는 모습을 보임",
            "화가 나거나 답답할 때 감정을 앞세우지 않고 자신의 생각을 부드럽게 표현하는 연습을 함",
            "각자의 장점을 짚어주며 합리적인 절충안을 제시하여 경직된 분위기를 반전시킴"
        ],
        outcomes: [
            "시행착오를 딛고 갈등을 평화적으로 해결하는 지혜와 성숙한 갈등관리 능력을 터득함.",
            "자신의 잘못을 반성하고 상대방을 배려하는 유연한 태도를 길러 급우들과의 유대감을 돈독히 다짐.",
            "개인의 감정을 슬기롭게 조절하며 집단의 화합에 기여하는 성숙한 인격적 성장을 보여줌."
        ]
    },
    peerCare: {
        category: "교우 관계 및 세심한 배려·나눔",
        situations: [
            "친구가 아프거나 몸이 불편한 상황에서",
            "단짝 친구가 조회·종례나 원격수업에 입장하지 못했을 때",
            "학급에서 소외되거나 적응에 어려움을 겪는 친구를 보았을 때",
            "급우들이 서로 다른 의견으로 감정이 상할 수 있는 순간에",
            "수업 준비물이 부족하거나 과제 해결에 어려움을 겪는 친구를 볼 때"
        ],
        actions: [
            "보건실과 급식실에 기꺼이 동행해 주고 필요한 학습 물품을 챙겨주는 따뜻함을 보임",
            "직접 연락을 취해 전달사항을 친절하게 안내하고 함께 참여할 수 있도록 챙김",
            "싫은 소리를 하지 않고 묵묵히 챙겨주는 스타일로 주변 친구들에게 먼저 다가감",
            "상대방의 기분을 고려하여 한 번 더 신중하게 생각하고 말을 건네며 갈등을 사전에 예방함",
            "자신의 학습 자료를 아낌없이 공유하고 친구가 이해할 때까지 친절하게 설명해 줌"
        ],
        outcomes: [
            "다정하고 사려 깊은 성품으로 친구들에게 편안함을 선사하며 교우관계에서 선호도가 매우 높음.",
            "타인의 입장을 먼저 헤아리고 배려하는 심성이 고와 학급의 신뢰받는 든든한 동료로 인정받음.",
            "원만한 친화력과 선한 영향력으로 교실 안의 온도를 따뜻하게 높여주는 훌륭한 인성을 지님."
        ]
    },
    teamworkLeadership: {
        category: "모둠 협력 및 민주적 조율",
        situations: [
            "학급 자치 회의 및 행사 준비 과정에서",
            "협력 학습 및 모둠 프로젝트를 진행할 때",
            "의견이 엇갈려 프로젝트 진행이 더뎌질 때",
            "학급 규칙을 정하는 토의 활동에서"
        ],
        actions: [
            "다른 사람의 입장에서 생각하고 소수의 의견도 경청하며 존중함",
            "학급회장(부회장)으로서 반을 위해 솔선수범하며 안전과 단합을 위해 힘씀",
            "다양한 아이디어를 침착하게 종합하여 합리적인 문제 해결 방법을 도출함",
            "친구의 고민을 들어주고 장점을 찾아 칭찬해 주는 등 타인을 존중하는 마음을 실천함",
            "주도적으로 모둠 활동에 참여하여 문제를 해결해 나가는 모습이 돋보임"
        ],
        outcomes: [
            "협동심과 포용력을 바탕으로 모둠의 과제를 훌륭하게 완수해 내는 지도력을 드러냄.",
            "동료들과 스스럼없이 소통하며 공동의 목표를 달성해 나가는 협력적 태도가 돋보임.",
            "합리적인 사고와 배려 깊은 태도로 급우들에게 긍정적인 영향력을 미치는 리더십을 보임."
        ]
    },
    disciplineHabits: {
        category: "규칙 준수 및 바른 생활습관",
        situations: [
            "단체 생활 속 기본적인 학급 규칙과 질서를 지켜야 할 때",
            "수업 준비물 챙기기 및 개인 학습 물품을 정돈하는 과정에서",
            "자신이 한 약속을 지키거나 독서 활동을 수행할 때",
            "학교의 공용 물품 및 교실 비품을 사용할 때"
        ],
        actions: [
            "정해진 규범을 준수하고 자신의 소지품과 공책을 깔끔하게 정돈함",
            "자신이 한 약속을 철저히 지키며 독서를 열심히 하여 남다른 독서량을 보임",
            "유혹에 흔들리지 않고 공공시설물을 아끼며 바른 언어 습관을 실천함",
            "매사에 준비하는 자세가 정착되어 있으며 일의 끝맺음을 빈틈없이 처리함",
            "학습지를 파일에 바르게 정리하고 자기 물건에 이름표를 꼼꼼히 붙임"
        ],
        outcomes: [
            "모든 일에 기본이 바로 서 있고 매사 믿음직스러운 모범적인 태도를 보여줌.",
            "침착하고 정직한 품성을 지녀 교사와 급우 모두에게 깊은 신뢰를 받음.",
            "안정된 생활 습관을 바탕으로 앞으로의 학교생활에서도 꾸준한 성장이 기대됨."
        ]
    },
    learningDiligence: {
        category: "성실·끈기 및 자기주도 학습",
        situations: [
            "매 수업 시간 및 자율학습 시간에",
            "자신이 세운 학습 목표와 계획을 실천하는 과정에서",
            "수학, 과학, 정보 등 탐구력이 요구되는 과제에 직면했을 때",
            "미술, 체육 등 예체능 및 관심 교과 수업 시"
        ],
        actions: [
            "공책에 필기할 때 글씨를 정자로 또박또박 쓰며 배운 내용을 꼼꼼히 정리함",
            "예술적 감수성이 풍부하여 자유롭고 개성 있는 활동과 창작 활동에 열정적으로 임함",
            "스스로 학습 계획을 세워 주도면밀하게 실천하며 의문점은 끝까지 질문하여 해결함",
            "신체를 이용하는 스포츠 시간에 뛰어난 운동 신경을 바탕으로 활기차게 참여함",
            "어려운 문제를 자신의 힘으로 풀고자 하는 의욕이 강해 끝까지 집중하여 과제를 완수함"
        ],
        outcomes: [
            "높은 성취욕구와 지적 호기심을 바탕으로 일관된 학업성취도를 유지하는 우수한 자기주도성을 보임.",
            "작은 과제 하나에도 정성을 다하는 성실함과 끈기를 지녀 학업 발전 가능성이 대단히 높은 학생임.",
            "기본 학습 습관이 바르게 정착되어 있어 매사에 믿음직스럽고 타의 모범이 되는 학업 태도를 갖춤."
        ]
    },
    cheerfulEnergy: {
        category: "밝고 쾌활한 사교성 및 활력",
        situations: [
            "일상적인 교실 생활 및 쉬는 시간에",
            "새로운 학급 행사에 참여하거나 모둠 활동을 펼칠 때",
            "단체 활동 중 분위기가 가라앉거나 지칠 수 있는 순간에",
            "동아리 및 학교 스포츠 클럽 활동에 참여할 때"
        ],
        actions: [
            "항상 환한 웃음과 유쾌한 언행으로 급우들을 즐겁게 하며 학급의 밝은 분위기를 주도함",
            "선입견 없이 모두에게 다정하고 친절하게 다가가 스스럼없이 친구 관계를 넓혀감",
            "단짝 친구뿐 아니라 다른 반 친구들과도 유대감이 두터워 폭넓은 교우관계를 유지함",
            "재치 있는 말과 공감 능력으로 상대방의 기분을 북돋아 주며 즐겁게 학교생활에 임함",
            "명랑하고 활동적인 것을 좋아하여 학교의 다양한 행사에 자발적으로 참여함"
        ],
        outcomes: [
            "특유의 긍정적인 사고와 사교성으로 주변에 건강한 에너지를 전파하는 매력적인 학생임.",
            "급우들과 두터운 유대감을 형성하여 원만하고 조화로운 학급 분위기를 만드는 일등공신임.",
            "낙천적이고 구김살 없는 태도로 매사에 즐겁게 참여하여 학교생활 적응도가 대단히 뛰어남."
        ]
    },
    growthEncouragement: {
        category: "보완 과제 및 발전 기대",
        situations: [
            "학습에 대한 흥미나 기초학력이 다소 부족하여 과제 수행에 어려움을 겪을 때",
            "집중력이 흐려지거나 주변 정돈이 미흡하여 스스로 개선이 필요할 때",
            "과묵하고 내향적이어서 자신의 장점을 적극적으로 표현하지 못하는 순간에",
            "발표에 대한 자신감이 다소 부족하여 단체 토의 시 소극적인 모습을 보일 때"
        ],
        actions: [
            "자신의 부족한 점을 솔직히 인정하고 교사의 조언을 진지하게 경청하며 점진적으로 과제를 완수함",
            "정자로 글씨를 또박또박 쓰려 노력하고 원격수업에 맞춰 학습을 마무리하는 성실함을 보임",
            "주변 친구들의 조언을 수용하며 부드럽고 긍정적인 언어로 자신의 감정을 표현하는 연습을 함",
            "자신이 맡은 1인 1역할을 성실히 수행하며 묵묵히 공동체에 기여하는 태도를 다져감"
        ],
        outcomes: [
            "자신의 약점을 보완하려는 태도 변화와 실천 의지가 뚜렷하여 장기적으로 큰 도약이 기대됨.",
            "목표 의식을 갖고 꾸준히 노력한다면 훨씬 더 모범적이고 훌륭한 인재로 성장할 잠재력을 지님.",
            "보다 적극적으로 자신을 표현하고 소통한다면 지니고 있는 많은 장점이 더욱 빛날 것임."
        ]
    },
    recycleHelper: {
        category: "학급 쓰레기 분리수거 담당",
        situations: [
            "학급 쓰레기 분리수거 담당자",
            "학급 분리수거 도우미",
            "교실 내 재활용품 및 분리배출 담당자"
        ],
        actions: [
            "지저분해지기 쉬운 분리수거함과 휴지통 주변을 매일 깔끔하게 정리정돈하고 쓰레기통을 적절한 때에 비워냄",
            "재활용할 수 있는 자원과 일반 쓰레기가 섞이지 않도록 분리배출 요령을 급우들에게 친절하게 안내함",
            "불평 한마디 없이 마스크와 장갑을 챙겨 들고 분리수거 용기를 깨끗이 세척함",
            "점심시간 및 방과 후 자발적으로 쓰레기 배출 상태를 점검하고 올바른 분리수거 문화를 학급에 정착시킴"
        ],
        outcomes: [
            "남들이 꺼리는 일에 앞장서며 쾌적한 교실 환경을 만드는 투철한 봉사정신과 책임감을 보여줌.",
            "말보다 묵묵한 실천으로 학급의 청결을 지켜 급우들과 교사에게 깊은 신뢰를 주는 모범적인 학생임.",
            "공동체를 위해 궂은일도 마다하지 않는 솔선수범의 자세로 학급의 보이지 않는 든든한 일꾼 역할을 다함."
        ]
    },
    infoHelper: {
        category: "정보 도우미",
        situations: [
            "학급 정보 도우미",
            "학급 멀티미디어 기기 관리 도우미",
            "교실 정보기기 운영 도우미"
        ],
        actions: [
            "수업 시작 전 교탁 컴퓨터와 전자칠판(TV), 빔프로젝터를 미리 켜두고 통신 상태를 점검하여 교과 수업 진행을 지원함",
            "학급 전자기기의 오류나 통신 장애 발생 시 신속하게 원인을 파악하여 교사를 보조하고 기자재를 안전하게 다룸",
            "수업 종료 후 프로젝터 및 디스플레이 전원을 끄고 리모컨, 연결선 등을 항상 제자리에 정돈함",
            "원격수업이나 시청각 행사 진행 시 영상 시설을 능숙하게 세팅하여 급우들이 쾌적하게 시청할 수 있도록 지원함",
            "원격수업에 대한 전달사항을 책임감을 가지고 안내하여 급우들의 참여를 독려함"
        ],
        outcomes: [
            "수업의 효율성을 높이는 데 크게 일조하며 기기 관리 능력과 투철한 성실성을 인정받음.",
            "학급의 원활한 정보 교육 환경을 조성하기 위해 솔선하여 움직이는 민첩하고 책임감 있는 학생임.",
            "교사와 급우들이 학습에 온전히 몰입할 수 있도록 묵묵히 지원하는 든든한 조력자 역할을 수행함."
        ]
    },
    phoneHelper: {
        category: "핸드폰 도우미(수거 및 관리)",
        situations: [
            "핸드폰 도우미",
            "스마트 안전지킴이(핸드폰 수거 및 관리 담당)",
            "학급 휴대폰 보관 도우미"
        ],
        actions: [
            "아침 조회 시간마다 급우들의 휴대폰을 빠짐없이 확인하여 수거 가방에 번호 순서대로 안전하게 보관함",
            "종례 시간까지 보관함을 철저히 관리하여 급우들이 학교생활에 온전히 집중할 수 있는 정숙한 분위기를 조성함",
            "제출을 깜빡한 친구가 없는지 부드럽고 다정하게 독려하여 자율적인 학급 규칙 준수를 이끌어냄",
            "종례 후 반환 시 전자기기를 안전하고 신속하게 배부하며 끝까지 책임감 있게 관리함"
        ],
        outcomes: [
            "급우들의 소중한 개인 사물을 분실 없이 안전하게 관리해 내는 정직함과 빈틈없는 책임감을 보여줌.",
            "학급의 면학 분위기를 조성하고 규칙을 준수하도록 유도하는 성실하고 신뢰받는 도우미 역할을 다함.",
            "매일 아침과 오후 한결같은 성실함으로 학급의 질서를 묵묵히 지켜나가는 모범생임."
        ]
    },
    morningCleanHelper: {
        category: "아침청소 도우미",
        situations: [
            "아침청소 도우미",
            "아침 환경도우미",
            "교실 아침 청결 도우미"
        ],
        actions: [
            "매일 아침 다른 급우들보다 일찍 등교하여 밤새 쌓인 먼지를 털어내고 교실 창문을 열어 환기를 시킴",
            "교실 바닥과 칠판, 교탁 주변을 빗자루와 걸레로 말끔하게 청소하고 지우개를 정돈하여 급우들을 맞이함",
            "흐트러진 책걸상을 바르게 정렬하고 복도 주변의 쓰레기를 치워 학급의 단정한 환경을 조성함",
            "누가 보지 않는 이른 아침 시간에도 묵묵히 빗자루를 들고 학교 주변 구석구석을 정돈하는 성실성을 실천함"
        ],
        outcomes: [
            "남다른 부지런함과 묵묵한 봉사정신으로 학급 구성원 모두에게 상쾌한 하루를 선물하는 고마운 학생임.",
            "말보다 행동으로 보여주는 성실함과 공동체를 위한 따뜻한 배려심으로 교사와 친구들의 깊은 사랑을 받음.",
            "자신의 시간과 노력을 아낌없이 들여 쾌적한 교실을 가꾸는 참된 이타적 품성을 지닌 학생임."
        ]
    },
    energyHelper: {
        category: "에너지 절약 도우미",
        situations: [
            "에너지 절약 도우미",
            "녹색지킴이(에너지 절약 및 교실 보안 담당)",
            "학급 환경지킴이(소등 및 시설 관리 담당)"
        ],
        actions: [
            "이동수업이나 급식 시간 등 교실을 비울 때 전등을 소등하고 빈 교실의 불필요한 전력 낭비를 철저히 차단함",
            "계절별 적정 실내 온도를 유지하기 위해 냉난방기를 점검하고 적절한 시간대에 전원을 철저히 관리함",
            "하교 시 및 이동수업 시 창문 잠금장치와 출입문 단속을 꼼꼼히 확인하여 도난 사고와 에너지 손실을 방지함",
            "사용하지 않는 전자기기의 대기전력을 살피고 급우들에게 에너지 절약의 필요성을 일깨우며 실천을 독려함"
        ],
        outcomes: [
            "학교 시설과 공공 자원을 내 물건처럼 아끼고 보살피는 성숙한 환경 의식과 절약 정신을 몸소 실천함.",
            "사소한 부분까지 놓치지 않는 세심한 관찰력과 책임감으로 교실의 보안과 에너지 절감에 크게 기여함.",
            "공동체의 자원을 아끼고 보호하는 데 솔선수범하여 타의 귀감이 되는 건전한 시민 의식을 보여줌."
        ]
    }
};

// 4. 공용 DB 연동 메모리 장부
let activePresets = JSON.parse(JSON.stringify(DEFAULT_BEHAVIOR_PRESETS));

export async function loadSharedPresetsFromDB() {
    try {
        const snap = await getDoc(doc(db, "shared_records_presets", "global_presets"));
        if (snap.exists() && snap.data().presets) {
            const remotePresets = snap.data().presets;
            activePresets = JSON.parse(JSON.stringify(DEFAULT_BEHAVIOR_PRESETS));
            for (const key in remotePresets) {
                if (activePresets[key]) {
                    activePresets[key].situations = Array.from(new Set([...activePresets[key].situations, ...(remotePresets[key].situations || [])]));
                    activePresets[key].actions = Array.from(new Set([...activePresets[key].actions, ...(remotePresets[key].actions || [])]));
                    activePresets[key].outcomes = Array.from(new Set([...activePresets[key].outcomes, ...(remotePresets[key].outcomes || [])]));
                } else {
                    activePresets[key] = remotePresets[key];
                }
            }
        }
    } catch (e) {
        console.warn("공용 행발 프리셋 DB 로드 주의 (기본값 사용):", e);
    }
    return activePresets;
}

export async function addSharedPresetToDB(categoryKey, { categoryName, situation, action, outcome }) {
    if (!categoryKey) return alert("카테고리를 지정해주세요.");
    if (!activePresets[categoryKey]) {
        activePresets[categoryKey] = { category: categoryName || categoryKey, situations: [], actions: [], outcomes: [] };
    }
    if (situation && !activePresets[categoryKey].situations.includes(situation.trim())) activePresets[categoryKey].situations.push(situation.trim());
    if (action && !activePresets[categoryKey].actions.includes(action.trim())) activePresets[categoryKey].actions.push(action.trim());
    if (outcome && !activePresets[categoryKey].outcomes.includes(outcome.trim())) activePresets[categoryKey].outcomes.push(outcome.trim());

    try {
        const docRef = doc(db, "shared_records_presets", "global_presets");
        const snap = await getDoc(docRef);
        let currentDBPresets = {};
        if (snap.exists() && snap.data().presets) currentDBPresets = snap.data().presets;
        if (!currentDBPresets[categoryKey]) currentDBPresets[categoryKey] = { category: activePresets[categoryKey].category, situations: [], actions: [], outcomes: [] };
        if (situation && !currentDBPresets[categoryKey].situations.includes(situation.trim())) currentDBPresets[categoryKey].situations.push(situation.trim());
        if (action && !currentDBPresets[categoryKey].actions.includes(action.trim())) currentDBPresets[categoryKey].actions.push(action.trim());
        if (outcome && !currentDBPresets[categoryKey].outcomes.includes(outcome.trim())) currentDBPresets[categoryKey].outcomes.push(outcome.trim());
        
        await setDoc(docRef, { presets: currentDBPresets, updatedAt: new Date().toISOString() });
        alert("✅ 공용 데이터베이스에 저장되었습니다. 모든 선생님 계정에서 바로 사용 가능합니다.");
    } catch (e) {
        console.error("공용 프리셋 DB 저장 실패:", e);
        alert("공용 DB 저장 중 오류가 발생했습니다.");
    }
    return activePresets;
}

export function getActivePresets() {
    return activePresets;
}

// 5. 선생님 문체 맞춤형 통합 조립기
export class BehaviorRecordEngine {
    static assemble({ studentName = "학생", situation = "", action = "", traits = [], customPrepend = "" }) {
        const rawTraits = Array.isArray(traits) ? traits : String(traits).split(/[,/ ]+/).map(t => t.trim()).filter(Boolean);
        const sitWithJosa = KoreanGrammar.attachSituationJosa(situation);
        const actClean = KoreanGrammar.formatActionConnective(action);
        const traitPhrase = KoreanGrammar.joinTraits(rawTraits);
        const traitObj = KoreanGrammar.attach(traitPhrase, '을를');
        const templates = [];

        if (sitWithJosa && actClean) {
            templates.push({
                style: "관찰·모범형",
                text: `${sitWithJosa} ${actClean}, 맡은 바 책임을 다하며 매사 ${traitPhrase} 있는 태도로 학교 활동에 적극적으로 참여하여 모범을 보임.`
            });
            templates.push({
                style: "교우 배려형",
                text: `${sitWithJosa} ${actClean}, 친구들에게 편안함을 선사하고 타인을 배려하는 ${traitObj} 몸소 실천하여 급우들의 신망이 두터움.`
            });
            templates.push({
                style: "성장 잠재력형",
                text: `${sitWithJosa} ${actClean}, 자신이 해야 할 일을 묵묵히 끝까지 마무리할 줄 알며, 평소 체득된 ${traitPhrase} 바탕으로 향후 발전 가능성이 대단히 높은 학생임.`
            });
            templates.push({
                style: "개선 노력형",
                text: `${sitWithJosa} ${actClean}, 교사의 지도와 조언을 진지하게 경청하고 스스로 부족한 부분을 보완하려는 태도를 보여 앞으로의 긍정적인 성장이 크게 기대됨.`
            });
        }

        return templates.map(item => {
            let fullText = item.text;
            if (customPrepend && customPrepend.trim()) {
                const prep = customPrepend.trim().replace(/\.+$/, '') + '.';
                fullText = `${prep} ${fullText}`;
            }
            const bytes = NEIS_RULES.calculateBytes(fullText);
            const forbidden = NEIS_RULES.checkForbiddenWords(fullText);
            return {
                style: item.style,
                sentence: fullText,
                bytes: bytes,
                byteLimit: 1500,
                forbiddenWords: forbidden,
                isValid: forbidden.length === 0 && bytes <= 1500
            };
        });
    }
}

// ==========================================
// [화면 UI 연결 코드 추가]
// ==========================================
export function setupRecordsModule() {
    document.getElementById('generateRecordBtn')?.addEventListener('click', handleGenerateRecord);
    document.getElementById('addSharedPresetBtn')?.addEventListener('click', handleAddSharedPreset);
}

export async function loadRecordsData() {
    await loadSharedPresetsFromDB();
    const presets = getActivePresets();

    const catSelect = document.getElementById('recordCategorySelect');
    if (!catSelect) return;
    const currentCat = catSelect.value;
    catSelect.innerHTML = '';
    
    Object.keys(presets).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = presets[key].category;
        catSelect.appendChild(opt);
    });

    catSelect.onchange = () => updateRecordDropdowns(presets[catSelect.value]);

    if (currentCat && presets[currentCat]) {
        catSelect.value = currentCat;
        updateRecordDropdowns(presets[currentCat]);
    } else if (Object.keys(presets).length > 0) {
        updateRecordDropdowns(presets[Object.keys(presets)[0]]);
    }

    const stuSelect = document.getElementById('recordStudentSelect');
    if (!stuSelect) return;
    const currentStu = stuSelect.value;
    stuSelect.innerHTML = '<option value="">학생 이름 생략 (문장만 조립)</option>';
    
    if (homeroomState && homeroomState.contacts && homeroomState.contacts.length > 0) {
        homeroomState.contacts.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = `${s.num}번 ${s.name}`;
            stuSelect.appendChild(opt);
        });
    }
    if (currentStu) {
        stuSelect.value = currentStu;
    }
}

function updateRecordDropdowns(preset) {
    const sitSelect = document.getElementById('recordSituationSelect');
    const actSelect = document.getElementById('recordActionSelect');
    if (!sitSelect || !actSelect) return;
    sitSelect.innerHTML = '';
    actSelect.innerHTML = '';

    preset.situations.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        sitSelect.appendChild(opt);
    });
    preset.actions.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        actSelect.appendChild(opt);
    });
}

function handleGenerateRecord() {
    const stuSelect = document.getElementById('recordStudentSelect');
    const name = stuSelect ? (stuSelect.value || "") : "";
    const sit = document.getElementById('recordSituationSelect')?.value || "";
    const act = document.getElementById('recordActionSelect')?.value || "";
    const traitsInput = document.getElementById('recordTraitsInput');
    const traits = traitsInput ? traitsInput.value : "";
    const prep = document.getElementById('recordMemoInput')?.value || "";

    if (!traits) {
        alert("역량 키워드(예: 솔선수범, 배려심)를 쉼표로 구분하여 하나 이상 입력해주세요.");
        if (traitsInput) traitsInput.focus();
        return;
    }

    const results = BehaviorRecordEngine.assemble({
        studentName: name,
        situation: sit,
        action: act,
        traits: traits,
        customPrepend: prep
    });

    const container = document.getElementById('recordResultsContainer');
    if (!container) return;
    container.innerHTML = '';

    results.forEach(res => {
        const div = document.createElement('div');
        div.className = "p-4 bg-white border border-indigo-100 rounded-2xl shadow-sm relative group hover:border-purple-300 transition-colors";
        
        let sentence = res.sentence;
        if (name) {
            sentence = `<span class="font-extrabold text-purple-700 bg-purple-50 px-1 rounded">${name}</span> 학생은 ` + sentence;
        }

        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">${res.style}</span>
                <span class="text-[11px] ${res.isValid ? 'text-emerald-500' : 'text-rose-500'} font-bold bg-slate-50 px-2 py-0.5 rounded-full">${res.bytes} / 1500 Byte</span>
            </div>
            <p class="text-[13px] text-slate-800 leading-relaxed font-medium tracking-tight break-keep pt-1">${sentence}</p>
            ${res.forbiddenWords.length > 0 ? `<p class="text-[11px] text-rose-500 mt-2 font-bold bg-rose-50 p-1 rounded"><i class="fa-solid fa-triangle-exclamation"></i> 금지어 감지: ${res.forbiddenWords.join(', ')}</p>` : ''}
        `;

        const copyBtn = document.createElement('button');
        copyBtn.className = "absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1";
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> 복사';
        
        const textToCopy = name ? `${name} 학생은 ${res.sentence}` : res.sentence;
        
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(textToCopy).then(() => alert('✅ 클립보드에 복사되었습니다. 나이스에 붙여넣기 하세요.'));
        };
        div.appendChild(copyBtn);
        container.appendChild(div);
    });
}

function handleAddSharedPreset() {
    const catSelect = document.getElementById('recordCategorySelect');
    if (!catSelect) return;
    const cat = catSelect.value;
    if (!cat) return;
    const presets = getActivePresets();
    const catName = presets[cat].category;
    
    const sit = prompt(`[${catName}] 공용으로 등록할 새로운 '상황' 문구를 입력하세요.\n(예: 학급 아침 조회 시간에)`);
    if (sit === null) return; 

    const act = prompt(`[${catName}] 공용으로 등록할 새로운 '행동' 문구를 입력하세요.\n(예: 단짝 친구를 챙기며 배려함)`);
    if (act === null) return;

    if (sit.trim() || act.trim()) {
        addSharedPresetToDB(cat, {
            categoryName: catName,
            situation: sit.trim(),
            action: act.trim()
        }).then(() => {
            loadRecordsData();
        });
    }
}
