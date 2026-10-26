import { db, doc, getDoc, setDoc } from '../firebase-config.js';
import { homeroomState } from './state.js';
import { DEFAULT_BEHAVIOR_PRESETS } from './default-presets.js'; // 🎯 데이터 창고 연결

// ==========================================
// 1. 데이터 엔진 및 로직부
// ==========================================

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

export const KoreanGrammar = {
    hasBatchim(word) {
        if (!word) return false;
        const clean = word.trim();
        const lastChar = clean.charAt(clean.length - 1);
        const code = lastChar.charCodeAt(0);
        if (code < 0xAC00 || code > 0xD7A3) return false;
        return (code - 0xAC00) % 28 > 0;
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
    }
};

let activePresets = {};

// 🎯 [자동 마이그레이션] DB에 데이터가 없으면 통째로 업로드!
export async function loadSharedPresetsFromDB() {
    try {
        const docRef = doc(db, "shared_records_presets", "global_presets");
        const snap = await getDoc(docRef);

        if (!snap.exists() || !snap.data().presets || Object.keys(snap.data().presets).length === 0) {
            console.log("DB에 행발 데이터가 없어 기본 프리셋을 최초 1회 자동 세팅합니다...");
            await setDoc(docRef, {
                presets: DEFAULT_BEHAVIOR_PRESETS,
                updatedAt: new Date().toISOString()
            });
            activePresets = JSON.parse(JSON.stringify(DEFAULT_BEHAVIOR_PRESETS));
        } else {
            activePresets = snap.data().presets;
        }
    } catch (e) {
        console.warn("DB 로드 에러(오프라인 시 기본값 사용):", e);
        activePresets = JSON.parse(JSON.stringify(DEFAULT_BEHAVIOR_PRESETS));
    }
    return activePresets;
}

export async function addSharedPresetToDB(categoryKey, { categoryName, situation, action, outcome }) {
    if (!categoryKey) return;
    
    try {
        const docRef = doc(db, "shared_records_presets", "global_presets");
        const snap = await getDoc(docRef);
        let currentDBPresets = snap.exists() && snap.data().presets ? snap.data().presets : {};

        // 카테고리가 없으면 새로 생성
        if (!currentDBPresets[categoryKey]) {
            currentDBPresets[categoryKey] = { 
                category: categoryName || categoryKey, 
                situations: [], 
                actions: [], 
                outcomes: [] 
            };
        }

        if (situation && !currentDBPresets[categoryKey].situations.includes(situation.trim())) {
            currentDBPresets[categoryKey].situations.push(situation.trim());
        }
        if (action && !currentDBPresets[categoryKey].actions.includes(action.trim())) {
            currentDBPresets[categoryKey].actions.push(action.trim());
        }
        if (outcome && !currentDBPresets[categoryKey].outcomes.includes(outcome.trim())) {
            currentDBPresets[categoryKey].outcomes.push(outcome.trim());
        }
        
        await setDoc(docRef, { presets: currentDBPresets, updatedAt: new Date().toISOString() });
        alert("✅ 공용 데이터베이스에 성공적으로 추가되었습니다.");
    } catch (e) {
        console.error("공용 프리셋 DB 저장 실패:", e);
        alert("공용 DB 저장 중 오류가 발생했습니다.");
    }
}

export function getActivePresets() {
    return activePresets;
}

export class BehaviorRecordEngine {
    static assemble({ studentName = "학생", situation = "", action = "", customPrepend = "" }) {
        const sitWithJosa = KoreanGrammar.attachSituationJosa(situation);
        const actClean = KoreanGrammar.formatActionConnective(action);
        const templates = [];

        if (sitWithJosa && actClean) {
            templates.push({
                style: "관찰·모범형",
                text: `${sitWithJosa} ${actClean}, 맡은 바 책임을 다하며 매사 진지하고 성실한 태도로 학교 활동에 적극적으로 참여하여 모범을 보임.`
            });
            templates.push({
                style: "교우 배려형",
                text: `${sitWithJosa} ${actClean}, 친구들에게 편안함을 선사하고 타인을 먼저 배려하는 따뜻한 마음씨를 몸소 실천하여 급우들의 신망이 두터움.`
            });
            templates.push({
                style: "성장 잠재력형",
                text: `${sitWithJosa} ${actClean}, 자신이 해야 할 일을 묵묵히 끝까지 마무리할 줄 알며, 평소 체득된 바른 인성과 책임감을 바탕으로 향후 발전 가능성이 대단히 높은 학생임.`
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
// 6. 화면 UI 연결 로직
// ==========================================

export function setupRecordsModule() {
    document.getElementById('generateRecordBtn')?.addEventListener('click', handleGenerateRecord);
    document.getElementById('addSharedPresetBtn')?.addEventListener('click', handleAddSharedPreset);
    
    // 역량 키워드 입력칸(HTML) 숨김 처리
    const traitsInputBox = document.getElementById('recordTraitsInput')?.parentElement;
    if (traitsInputBox) traitsInputBox.classList.add('hidden');
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
    const prep = document.getElementById('recordMemoInput')?.value || "";

    const results = BehaviorRecordEngine.assemble({
        studentName: name,
        situation: sit,
        action: act,
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

// 🎯 [세부 추가 로직 분리] 항목별로 정밀하게 추가 가능하도록 업그레이드!
async function handleAddSharedPreset() {
    const choice = prompt("추가할 항목의 번호를 입력하세요.\n1. 새로운 '상황/역할 카테고리' 만들기\n2. 현재 카테고리에 '세부 상황' 추가\n3. 현재 카테고리에 '구체적 행동/변화' 추가");
    
    if (choice === '1') {
        const catName = prompt("새로운 카테고리 이름을 입력하세요.\n(예: 진로 특강 도우미)");
        if (!catName) return;
        const newKey = `custom_${Date.now()}`;
        await addSharedPresetToDB(newKey, { categoryName: catName });
        
    } else if (choice === '2') {
        const catSelect = document.getElementById('recordCategorySelect');
        if (!catSelect || !catSelect.value) return alert("먼저 카테고리를 선택하세요.");
        const sit = prompt("현재 카테고리에 추가할 새로운 '세부 상황'을 입력하세요.\n(예: 진로 특강 시간이나 적성 검사 시)");
        if (!sit) return;
        await addSharedPresetToDB(catSelect.value, { situation: sit });
        
    } else if (choice === '3') {
        const catSelect = document.getElementById('recordCategorySelect');
        if (!catSelect || !catSelect.value) return alert("먼저 카테고리를 선택하세요.");
        const act = prompt("현재 카테고리에 추가할 새로운 '구체적 행동/변화'를 입력하세요.\n(예: 자신의 적성을 진지하게 탐색하고 적극적으로 질문함)");
        if (!act) return;
        await addSharedPresetToDB(catSelect.value, { action: act });
        
    } else if (choice !== null) {
        alert("1, 2, 3 중에서 입력해주세요.");
        return;
    }

    // 항목 추가 후 즉시 드롭다운 새로고침
    await loadRecordsData();
}
