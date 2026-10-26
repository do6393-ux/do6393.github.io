import { db, doc, getDoc, setDoc } from '../firebase-config.js';
import { homeroomState } from './state.js';

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
homeroomState.accumulatedRecords = {}; // 학생별 누적 데이터 저장소

export async function loadSharedPresetsFromDB() {
    try {
        const docRef = doc(db, "shared_records_presets", "global_presets");
        const snap = await getDoc(docRef);

        if (snap.exists() && snap.data().presets) {
            activePresets = snap.data().presets;
        } else {
            console.warn("DB에 데이터가 없습니다.");
            activePresets = {};
        }
    } catch (e) {
        console.warn("DB 로드 에러:", e);
    }
    return activePresets;
}

export async function addSharedPresetToDB(categoryKey, { categoryName, situation, action, outcome }) {
    if (!categoryKey) return;
    
    try {
        const docRef = doc(db, "shared_records_presets", "global_presets");
        const snap = await getDoc(docRef);
        let currentDBPresets = snap.exists() && snap.data().presets ? snap.data().presets : {};

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
        
        await setDoc(docRef, { presets: currentDBPresets, updatedAt: new Date().toISOString() });
    } catch (e) {
        console.error("공용 프리셋 DB 저장 실패:", e);
        throw e;
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

let currentSelectedStudentName = "";
let currentArchiveStudentName = "";

export function setupRecordsModule() {
    document.getElementById('generateRecordBtn')?.addEventListener('click', handleGenerateRecord);
    
    document.getElementById('openCustomPresetModalBtn')?.addEventListener('click', openPresetModal);
    document.getElementById('closePresetModalBtn')?.addEventListener('click', closePresetModal);
    document.getElementById('cancelPresetModalBtn')?.addEventListener('click', closePresetModal);
    document.getElementById('savePresetBtn')?.addEventListener('click', saveCustomPreset);
    
    const typeBtns = document.querySelectorAll('.preset-type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            typeBtns.forEach(b => {
                b.classList.remove('active', 'bg-purple-50', 'border-purple-200', 'text-purple-700');
                b.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-600');
            });
            e.target.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-600');
            e.target.classList.add('active', 'bg-purple-50', 'border-purple-200', 'text-purple-700');
            
            const type = e.target.dataset.type;
            const catWrapper = document.getElementById('presetCategoryWrapper');
            const newCatWrapper = document.getElementById('presetNewCategoryWrapper');
            const label = document.getElementById('presetInputLabel');
            const input = document.getElementById('presetTextInput');

            if (type === 'category') {
                catWrapper.classList.add('hidden');
                newCatWrapper.classList.remove('hidden');
                label.textContent = "대표 상황 문구 입력";
                input.placeholder = "예: 진로 특강 시간에 자신의 적성을 탐색할 때";
            } else {
                catWrapper.classList.remove('hidden');
                newCatWrapper.classList.add('hidden');
                label.textContent = type === 'situation' ? "세부 상황 문구 입력" : "구체적 행동 문구 입력";
                input.placeholder = type === 'situation' ? "예: 학급 자치 회의를 진행하는 상황에서" : "예: 친구들의 의견을 경청하고 조율함";
            }
        });
    });

    // 🎯 내부 탭 전환 이벤트
    document.getElementById('recordInnerTabEngineBtn')?.addEventListener('click', () => switchRecordInnerTab('engine'));
    document.getElementById('recordInnerTabArchiveBtn')?.addEventListener('click', () => switchRecordInnerTab('archive'));

    // 누적 기록 에디터 이벤트
    const archiveTextarea = document.getElementById('archiveTextarea');
    archiveTextarea?.addEventListener('input', () => {
        const text = archiveTextarea.value;
        const bytes = NEIS_RULES.calculateBytes(text);
        const countEl = document.getElementById('archiveByteCount');
        if (countEl) countEl.textContent = `${bytes} / 1500 Byte`;
        if (bytes > 1500) countEl.classList.replace('text-slate-500', 'text-rose-500');
        else countEl.classList.replace('text-rose-500', 'text-slate-500');
    });

    document.getElementById('archiveSaveBtn')?.addEventListener('click', saveAccumulatedRecords);
    document.getElementById('archiveClearBtn')?.addEventListener('click', () => {
        if(!confirm("해당 학생의 누적 기록을 비우시겠습니까?")) return;
        if(archiveTextarea) archiveTextarea.value = '';
        saveAccumulatedRecords();
    });
    document.getElementById('archiveCopyBtn')?.addEventListener('click', () => {
        if(!archiveTextarea || !archiveTextarea.value) return;
        navigator.clipboard.writeText(archiveTextarea.value).then(() => alert('✅ 전체 내용이 복사되었습니다.'));
    });
}

function switchRecordInnerTab(tabName) {
    const btnEngine = document.getElementById('recordInnerTabEngineBtn');
    const btnArchive = document.getElementById('recordInnerTabArchiveBtn');
    const viewEngine = document.getElementById('recordEngineContainer');
    const viewArchive = document.getElementById('recordArchiveContainer');

    const activeClass = "px-4 py-2 text-sm font-bold bg-white text-purple-600 rounded-lg shadow-sm transition-all";
    const inactiveClass = "px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-lg transition-all";

    if (tabName === 'engine') {
        btnEngine.className = activeClass;
        btnArchive.className = inactiveClass;
        viewEngine.classList.remove('hidden');
        viewArchive.classList.add('hidden');
        renderRecordStudentList('engine');
    } else {
        btnArchive.className = activeClass;
        btnEngine.className = inactiveClass;
        viewArchive.classList.remove('hidden');
        viewEngine.classList.add('hidden');
        renderRecordStudentList('archive');
        loadArchiveTextarea();
    }
}

export async function loadRecordsData() {
    await loadSharedPresetsFromDB();
    const presets = getActivePresets();

    const catSelect = document.getElementById('recordCategorySelect');
    if (catSelect) {
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
    }

    // 초기 누적 데이터 로컬스토리지(또는 DB)에서 불러오기
    const uid = homeroomState.userId;
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    const localData = localStorage.getItem(`records_${uid}_${g}_${c}`);
    if (localData) {
        homeroomState.accumulatedRecords = JSON.parse(localData);
    } else {
        homeroomState.accumulatedRecords = {};
    }

    renderRecordStudentList('engine');
}

// 🎯 학생 명단 렌더링 (엔진 탭 / 아카이브 탭 공용 대응)
function renderRecordStudentList(mode = 'engine') {
    const listWrapper = document.getElementById(mode === 'engine' ? 'recordStudentListWrapper' : 'archiveStudentListWrapper');
    const countEl = document.getElementById('recordStudentCount'); // engine용
    if (!listWrapper) return;

    listWrapper.innerHTML = '';
    const contacts = homeroomState.contacts || [];
    if (countEl && mode === 'engine') countEl.textContent = `${contacts.length}명`;

    if (contacts.length === 0) {
        listWrapper.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">비상연락망에 명단을 추가하세요.</div>`;
        return;
    }

    contacts.forEach(s => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-colors flex items-center justify-between group focus:outline-none";
        
        const targetSelected = mode === 'engine' ? currentSelectedStudentName : currentArchiveStudentName;
        
        if (targetSelected === s.name) {
            btn.classList.replace('bg-slate-50', 'bg-purple-100');
            btn.classList.replace('border-slate-200', 'border-purple-400');
        }
        
        // 누적 기록이 있는지 표시
        const hasRecord = homeroomState.accumulatedRecords[s.name] && homeroomState.accumulatedRecords[s.name].trim().length > 0;
        const checkIcon = hasRecord ? `<i class="fa-solid fa-check text-emerald-500 text-xs"></i>` : '';

        btn.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-[11px] font-extrabold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 group-hover:text-purple-600 group-hover:border-purple-200">${s.num}번</span>
                <span class="text-sm font-bold text-slate-700 group-hover:text-purple-800">${s.name}</span>
            </div>
            ${checkIcon}
        `;
        
        btn.onclick = () => {
            if (mode === 'engine') {
                currentSelectedStudentName = s.name;
                currentArchiveStudentName = s.name; // 동기화
                const badge = document.getElementById('recordSelectedStudentBadge');
                if(badge) {
                    badge.textContent = `${s.num}번 ${s.name} 선택됨`;
                    badge.classList.replace('text-slate-400', 'text-purple-600');
                    badge.classList.replace('bg-slate-50', 'bg-purple-100');
                }
                renderRecordStudentList('engine');
                handleGenerateRecord();
            } else {
                currentArchiveStudentName = s.name;
                currentSelectedStudentName = s.name; // 동기화
                renderRecordStudentList('archive');
                loadArchiveTextarea();
            }
        };
        listWrapper.appendChild(btn);
    });
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
    const name = currentSelectedStudentName;
    const sit = document.getElementById('recordSituationSelect')?.value || "";
    const act = document.getElementById('recordActionSelect')?.value || "";
    const prep = document.getElementById('recordMemoInput')?.value || "";

    if (!sit || !act) return;

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
        div.className = "p-4 bg-white border border-slate-200 rounded-2xl shadow-sm relative group hover:border-purple-400 cursor-pointer transition-colors";
        
        let sentence = res.sentence;
        if (name) {
            sentence = `<span class="font-extrabold text-purple-700 bg-purple-50 px-1 rounded">${name}</span> 학생은 ` + sentence;
        } else {
            sentence = `<span class="font-extrabold text-slate-400 bg-slate-100 px-1 rounded">(이름)</span> 학생은 ` + sentence;
        }

        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">${res.style}</span>
                <span class="text-[11px] ${res.isValid ? 'text-emerald-500' : 'text-rose-500'} font-bold bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">${res.bytes} / 1500 Byte</span>
            </div>
            <p class="text-[13px] text-slate-800 leading-relaxed font-medium tracking-tight break-keep pt-1 select-none pointer-events-none">${sentence}</p>
        `;

        // 🎯 클릭 시 개인별 누적 기록에 저장 (클립보드 복사 대체)
        div.onclick = () => {
            if (!name) return alert('왼쪽 명단에서 학생을 먼저 선택해주세요.');
            
            let current = homeroomState.accumulatedRecords[name] || "";
            if (current) current += " ";
            current += res.sentence; // '이름 학생은' 빼고 순수 문장만 합침
            homeroomState.accumulatedRecords[name] = current;
            
            saveAccumulatedRecords(false);
            
            const toast = document.createElement('div');
            toast.className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg opacity-0 transition-opacity z-10 whitespace-nowrap";
            toast.innerHTML = `<i class="fa-solid fa-check"></i> '${name}' 누적 기록에 저장됨`;
            div.appendChild(toast);
            setTimeout(() => toast.classList.add('opacity-100'), 10);
            setTimeout(() => {
                toast.classList.remove('opacity-100');
                setTimeout(() => toast.remove(), 300);
            }, 1200);
            
            // 학생 명단 V표시 갱신
            renderRecordStudentList('engine');
        };
        container.appendChild(div);
    });
}

function loadArchiveTextarea() {
    const titleEl = document.getElementById('archiveSelectedStudentTitle');
    const textarea = document.getElementById('archiveTextarea');
    const countEl = document.getElementById('archiveByteCount');

    if (!currentArchiveStudentName) {
        titleEl.textContent = "학생을 선택하세요";
        titleEl.classList.replace('text-indigo-700', 'text-slate-400');
        textarea.value = "";
        textarea.disabled = true;
        if(countEl) countEl.textContent = "0 / 1500 Byte";
        return;
    }

    titleEl.textContent = `${currentArchiveStudentName} 학생의 누적 기록`;
    titleEl.classList.replace('text-slate-400', 'text-indigo-700');
    textarea.disabled = false;
    
    const text = homeroomState.accumulatedRecords[currentArchiveStudentName] || "";
    textarea.value = text;
    
    const bytes = NEIS_RULES.calculateBytes(text);
    if(countEl) {
        countEl.textContent = `${bytes} / 1500 Byte`;
        if (bytes > 1500) countEl.classList.replace('text-slate-500', 'text-rose-500');
        else countEl.classList.replace('text-rose-500', 'text-slate-500');
    }
}

async function saveAccumulatedRecords(showAlert = true) {
    if (currentArchiveStudentName) {
        const textarea = document.getElementById('archiveTextarea');
        if (textarea && !textarea.disabled) {
            homeroomState.accumulatedRecords[currentArchiveStudentName] = textarea.value;
        }
    }

    const uid = homeroomState.userId;
    const g = homeroomState.grade;
    const c = homeroomState.classNum;
    
    // 로컬 저장
    localStorage.setItem(`records_${uid}_${g}_${c}`, JSON.stringify(homeroomState.accumulatedRecords));
    
    // DB 저장
    try {
        await setDoc(doc(db, "homeroom_records", `${uid}_${g}_${c}`), {
            userId: uid,
            grade: g,
            classNum: c,
            records: homeroomState.accumulatedRecords,
            updatedAt: new Date().toISOString()
        });
        if(showAlert) alert('✅ 누적 기록이 안전하게 저장되었습니다.');
        renderRecordStudentList('archive');
    } catch (e) {
        console.error("누적 기록 DB 저장 에러:", e);
        if(showAlert) alert('저장 중 네트워크 오류가 발생했으나, 이 브라우저에는 저장되었습니다.');
    }
}

// 🎯 커스텀 모달 열기 및 세팅
function openPresetModal() {
    const modal = document.getElementById('customPresetModal');
    const catTargetSelect = document.getElementById('presetTargetCategory');
    const presets = getActivePresets();
    
    catTargetSelect.innerHTML = '';
    Object.keys(presets).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = presets[key].category;
        catTargetSelect.appendChild(opt);
    });

    const activeMainCat = document.getElementById('recordCategorySelect')?.value;
    if (activeMainCat && presets[activeMainCat]) {
        catTargetSelect.value = activeMainCat;
    }

    document.getElementById('presetNewCategoryInput').value = '';
    document.getElementById('presetTextInput').value = '';
    modal.classList.remove('hidden');
}

function closePresetModal() {
    document.getElementById('customPresetModal').classList.add('hidden');
}

async function saveCustomPreset() {
    const activeTypeBtn = document.querySelector('.preset-type-btn.active');
    if (!activeTypeBtn) return;
    const type = activeTypeBtn.dataset.type;
    
    const textInput = document.getElementById('presetTextInput').value.trim();
    if (!textInput) return alert("추가할 내용을 입력해주세요.");

    const btn = document.getElementById('savePresetBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장중...';
    btn.disabled = true;

    try {
        if (type === 'category') {
            const newCatName = document.getElementById('presetNewCategoryInput').value.trim();
            if (!newCatName) throw new Error("새 카테고리 이름을 입력하세요.");
            const newKey = `custom_${Date.now()}`;
            await addSharedPresetToDB(newKey, { categoryName: newCatName, situation: textInput });
        } else if (type === 'situation') {
            const catKey = document.getElementById('presetTargetCategory').value;
            await addSharedPresetToDB(catKey, { situation: textInput });
        } else if (type === 'action') {
            const catKey = document.getElementById('presetTargetCategory').value;
            await addSharedPresetToDB(catKey, { action: textInput });
        }

        closePresetModal();
        await loadRecordsData(); 
        alert("✅ 공용 데이터베이스에 추가되어 즉시 사용할 수 있습니다.");
    } catch (e) {
        if (e.message) alert(e.message);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> DB에 저장';
        btn.disabled = false;
    }
}
