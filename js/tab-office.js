import { db, doc, getDoc, setDoc } from './firebase-config.js';

export const teacherList = [];

export let officeState = {
    userId: localStorage.getItem('user_id') || "default_teacher",
    teacherName: localStorage.getItem('office_teacher_name') || "신정훈",
    get selectedTeacher() {
        return { name: this.teacherName, short: this.teacherName };
    },
    set selectedTeacher(val) {
        if (typeof val === 'string') this.teacherName = val;
        else if (val && (val.name || val.short)) this.teacherName = val.name || val.short;
    },
    selectedGrade: Number(localStorage.getItem('office_grade')) || 1,
    selectedClassNum: Number(localStorage.getItem('office_class')) || 7,
    isNextWeek: false
};

// 동적 기본 시간표 상태 배열
let currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let activeBaseModalType = null; 

// 이벤트(민트색) 과목 식별 키워드
const eventKeywords = ['자치', '동아', '봉사', '진로'];

// 🎯 Firestore 호환 2차원 데이터 파서 (문자열, 1차원, 2차원 모두 안전 처리)
function parseMatrixData(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parseMatrixData(parsed);
        } catch(e) {
            return null;
        }
    }
    if (Array.isArray(raw)) {
        if (Array.isArray(raw[0])) return raw;
        if (raw.length === 35) {
            const res = [];
            for (let i = 0; i < 7; i++) res.push(raw.slice(i * 5, (i + 1) * 5));
            return res;
        }
    }
    return null;
}

export async function initOfficeTab(currentUser) {
    // 1. 로그인 계정 UID 연동 (모바일 비로그인/지연 상태에서도 시간표 조회 보장)
    if (currentUser && currentUser.uid) {
        officeState.userId = currentUser.uid;
        localStorage.setItem('user_id', currentUser.uid);
    }
    
    // 2. 파이어베이스 DB에서 저장된 기본 설정(교사명, 학급) 불러오기
    try {
        const settingSnap = await getDoc(doc(db, "app_settings", `${officeState.userId}_office_profile`));
        if (settingSnap.exists()) {
            const data = settingSnap.data();
            if (data.teacherName) {
                officeState.teacherName = data.teacherName;
                localStorage.setItem('office_teacher_name', data.teacherName);
            }
            if (data.grade) {
                officeState.selectedGrade = Number(data.grade);
                localStorage.setItem('office_grade', data.grade);
            }
            if (data.classNum) {
                officeState.selectedClassNum = Number(data.classNum);
                localStorage.setItem('office_class', data.classNum);
            }
        } else {
            const legacySnap = await getDoc(doc(db, "app_settings", "office_profile"));
            if (legacySnap.exists()) {
                const data = legacySnap.data();
                if (data.teacherName) officeState.teacherName = data.teacherName;
                if (data.grade) officeState.selectedGrade = Number(data.grade);
                if (data.classNum) officeState.selectedClassNum = Number(data.classNum);
            }
        }
    } catch (e) {
        console.warn("파이어베이스 설정 로드 실패 (로컬 데이터 유지):", e);
    }
    
    // 3. 교사 성함 클릭 시 직접 변경 팝업
    document.getElementById('titleTeacherNameBtn')?.addEventListener('click', () => {
        openTeacherInputModal();
    });
    
    document.getElementById('closeTeacherSelectModalBtn')?.addEventListener('click', () => {
        document.getElementById('teacherSelectModal').classList.add('hidden');
    });

    // 4. 학급 선택 모달 (1~3학년, 1~10반)
    document.getElementById('titleClassNameBtn')?.addEventListener('click', () => {
        const container = document.getElementById('modalClassList');
        container.innerHTML = '';
        for (let g = 1; g <= 3; g++) {
            for (let c = 1; c <= 10; c++) {
                const btn = document.createElement('button');
                btn.className = `p-2 rounded-xl border text-center font-bold transition-colors ${(officeState.selectedGrade === g && officeState.selectedClassNum === c) ? 'bg-sky-50 text-sky-700 border-sky-200' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`;
                btn.textContent = `${g}-${c}`;
                btn.onclick = async () => {
                    officeState.selectedGrade = g;
                    officeState.selectedClassNum = c;
                    localStorage.setItem('office_grade', g);
                    localStorage.setItem('office_class', c);
                    document.getElementById('titleClassNameBtn').textContent = `${g}-${c}`;
                    document.getElementById('classSelectModal').classList.add('hidden');
                    
                    try {
                        await setDoc(doc(db, "app_settings", `${officeState.userId}_office_profile`), {
                            userId: officeState.userId,
                            teacherName: officeState.teacherName,
                            grade: g,
                            classNum: c,
                            updatedAt: new Date().toISOString()
                        }, { merge: true });
                    } catch(e) {}

                    loadAllTimetables();
                };
                container.appendChild(btn);
            }
        }
        document.getElementById('classSelectModal').classList.remove('hidden');
    });
    
    document.getElementById('closeClassSelectModalBtn')?.addEventListener('click', () => document.getElementById('classSelectModal').classList.add('hidden'));

    // 5. 내 계정 설정 모달 (상단 ⚙️ 버튼) 연동
    const profileModal = document.getElementById('profileSettingsModal');
    const profileTeacherInput = document.getElementById('profileTeacherInput');
    const profileGradeSelect = document.getElementById('profileGradeSelect');
    const profileClassSelect = document.getElementById('profileClassSelect');

    document.getElementById('openProfileSettingsBtn')?.addEventListener('click', () => {
        if (profileTeacherInput) profileTeacherInput.value = officeState.teacherName;
        if (profileGradeSelect) profileGradeSelect.value = String(officeState.selectedGrade);
        if (profileClassSelect) profileClassSelect.value = String(officeState.selectedClassNum);
        profileModal?.classList.remove('hidden');
    });

    document.getElementById('closeProfileSettingsBtn')?.addEventListener('click', () => profileModal?.classList.add('hidden'));

    document.getElementById('saveProfileSettingsBtn')?.addEventListener('click', async () => {
        const tName = profileTeacherInput ? profileTeacherInput.value.trim() : "";
        const gr = profileGradeSelect ? Number(profileGradeSelect.value) : 1;
        const cl = profileClassSelect ? Number(profileClassSelect.value) : 7;

        if (tName) officeState.teacherName = tName;
        officeState.selectedGrade = gr;
        officeState.selectedClassNum = cl;

        localStorage.setItem('office_teacher_name', officeState.teacherName);
        localStorage.setItem('office_grade', gr);
        localStorage.setItem('office_class', cl);

        document.getElementById('titleTeacherNameBtn').textContent = officeState.teacherName;
        document.getElementById('titleClassNameBtn').textContent = `${gr}-${cl}`;

        try {
            await setDoc(doc(db, "app_settings", `${officeState.userId}_office_profile`), {
                userId: officeState.userId,
                teacherName: officeState.teacherName,
                grade: gr,
                classNum: cl,
                updatedAt: new Date().toISOString()
            });
        } catch(e) {
            console.error("설정 DB 저장 실패:", e);
        }

        profileModal?.classList.add('hidden');
        loadAllTimetables();
    });

    // 6. 기본 시간표 설정 모달 연결
    const baseModal = document.getElementById('baseTimetableModal');
    
    document.getElementById('openTeacherBaseBtn')?.addEventListener('click', async () => {
        activeBaseModalType = 'teacher';
        renderBaseModalTitle('teacher', officeState.teacherName);
        renderBaseTimetableInputGrid(currentTeacherBaseTimetable);
        baseModal.classList.remove('hidden');

        // 혹시 비어있다면 DB에서 즉시 재조회
        if (isMatrixEmpty(currentTeacherBaseTimetable)) {
            await fetchAndFillTeacherBase(officeState.teacherName);
        }
    });

    document.getElementById('openClassBaseBtn')?.addEventListener('click', async () => {
        activeBaseModalType = 'class';
        const classTarget = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
        renderBaseModalTitle('class', classTarget);
        renderBaseTimetableInputGrid(currentClassBaseTimetable);
        baseModal.classList.remove('hidden');

        if (isMatrixEmpty(currentClassBaseTimetable)) {
            await fetchAndFillClassBase(officeState.selectedGrade, officeState.selectedClassNum);
        }
    });

    document.getElementById('closeBaseTimetableModalBtn')?.addEventListener('click', () => baseModal.classList.add('hidden'));

    // 🎯 7. 기본 시간표 저장 로직 (Firestore 2차원 배열 제약 해결)
    document.getElementById('saveBaseTimetableBtn')?.addEventListener('click', async () => {
        const newData = Array(7).fill().map(() => Array(5).fill(""));
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 5; c++) {
                const el = document.getElementById(`baseInput_${r}_${c}`);
                const val = el ? el.value.trim() : "";
                newData[r][c] = val;
            }
        }

        const uid = officeState.userId || "default_teacher";
        const tName = officeState.teacherName || "신정훈";
        const gr = officeState.selectedGrade || 1;
        const cl = officeState.selectedClassNum || 7;

        // 로컬 캐시 즉시 반영
        if (activeBaseModalType === 'teacher') {
            currentTeacherBaseTimetable = newData;
            localStorage.setItem(`base_tt_teacher_${uid}_${tName}`, JSON.stringify(newData));
            localStorage.setItem(`base_tt_teacher_${tName}`, JSON.stringify(newData));
        } else {
            currentClassBaseTimetable = newData;
            const classKey = `${gr}-${cl}`;
            localStorage.setItem(`base_tt_class_${uid}_${classKey}`, JSON.stringify(newData));
            localStorage.setItem(`base_tt_class_${classKey}`, JSON.stringify(newData));
        }

        baseModal.classList.add('hidden');
        loadAllTimetables();

        // 🎯 Firestore에는 JSON 문자열로 저장하여 Nested Array 거부 에러 완벽 해결
        const matrixString = JSON.stringify(newData);
        try {
            if (activeBaseModalType === 'teacher') {
                const payload = {
                    userId: uid,
                    teacherName: tName,
                    matrix: matrixString,
                    matrixJson: matrixString,
                    updatedAt: new Date().toISOString()
                };
                await setDoc(doc(db, "base_timetables", `${uid}_teacher_${tName}`), payload);
                await setDoc(doc(db, "base_timetables", `teacher_${tName}`), payload);
            } else {
                const payload = {
                    userId: uid,
                    grade: gr,
                    classNum: cl,
                    matrix: matrixString,
                    matrixJson: matrixString,
                    updatedAt: new Date().toISOString()
                };
                await setDoc(doc(db, "base_timetables", `${uid}_class_${gr}_${cl}`), payload);
                await setDoc(doc(db, "base_timetables", `class_${gr}_${cl}`), payload);
            }
        } catch (e) {
            console.error("Firestore 기본 시간표 저장 에러:", e);
        }
    });

    // 8. 주간 토글
    const btnThis = document.getElementById('weekToggleThisBtn');
    const btnNext = document.getElementById('weekToggleNextBtn');
    
    btnThis?.addEventListener('click', () => {
        officeState.isNextWeek = false;
        btnThis.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 shadow-sm rounded-lg transition-all";
        btnNext.className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg transition-all";
        loadAllTimetables();
    });
    
    btnNext?.addEventListener('click', () => {
        officeState.isNextWeek = true;
        btnNext.className = "px-3 py-1 text-xs font-bold bg-white text-indigo-700 shadow-sm rounded-lg transition-all";
        btnThis.className = "px-3 py-1 text-xs font-medium text-slate-600 rounded-lg transition-all";
        loadAllTimetables();
    });

    // 9. 급식 초기화
    const mealDateInput = document.getElementById('mealDateInput');
    const fetchMealBtn = document.getElementById('fetchMealBtn');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (mealDateInput && !mealDateInput.value) {
        mealDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    
    fetchMealBtn?.addEventListener('click', fetchMeal);
    mealDateInput?.addEventListener('change', fetchMeal);
    
    document.getElementById('titleTeacherNameBtn').textContent = officeState.teacherName;
    document.getElementById('titleClassNameBtn').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;

    await loadAllTimetables();
    fetchMeal();
}

function isMatrixEmpty(m) {
    if (!m || !Array.isArray(m)) return true;
    return m.every(r => Array.isArray(r) && r.every(c => !c || c.trim() === ''));
}

// 🎯 기본시간표 모달 제목 렌더링 및 교사명 클릭 시 즉시 교체 이벤트
function renderBaseModalTitle(type, targetName) {
    const titleEl = document.getElementById('baseTimetableModalTitle');
    const descEl = document.getElementById('baseTimetableModalDesc');
    if (!titleEl || !descEl) return;

    if (type === 'teacher') {
        titleEl.innerHTML = `
            <span id="modalTeacherNameSwitchBtn" class="cursor-pointer underline decoration-dotted decoration-indigo-500 hover:text-indigo-600 text-indigo-700 transition-colors" title="클릭하여 교사 변경">${targetName}</span> 교사 기본 시간표 설정
            <button id="modalTeacherNameSwitchBtn2" type="button" class="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 ml-1.5 transition-colors align-middle"><i class="fa-solid fa-arrows-rotate mr-1"></i>교사 변경</button>
        `;
        descEl.textContent = "입력 예시: 108정보 (이름을 눌러 다른 선생님으로 변경할 수 있으며, 저장 시 모바일과 PC에 모두 영구 동기화됩니다)";

        const handleSwitch = () => {
            openTeacherInputModal(async (newTeacherName) => {
                officeState.teacherName = newTeacherName;
                localStorage.setItem('office_teacher_name', newTeacherName);
                document.getElementById('titleTeacherNameBtn').textContent = newTeacherName;

                renderBaseModalTitle('teacher', newTeacherName);
                await fetchAndFillTeacherBase(newTeacherName);
            });
        };

        document.getElementById('modalTeacherNameSwitchBtn')?.addEventListener('click', handleSwitch);
        document.getElementById('modalTeacherNameSwitchBtn2')?.addEventListener('click', handleSwitch);
    } else {
        titleEl.textContent = `${targetName} 학급 기본 시간표 설정`;
        descEl.textContent = "입력 예시: 국어, 체육 (앞 2글자 교과목명만 일치하면 정상으로 판별합니다)";
    }
}

// 🎯 특정 교사의 시간표를 DB에서 불러와 모달 입력창에 채우기
async function fetchAndFillTeacherBase(tName) {
    const uid = officeState.userId;
    const keys = [`${uid}_teacher_${tName}`, `teacher_${tName}`];
    let loaded = null;

    for (const key of keys) {
        try {
            const snap = await getDoc(doc(db, "base_timetables", key));
            if (snap.exists()) {
                const d = snap.data();
                loaded = parseMatrixData(d.matrixJson || d.matrix || d.table);
                if (loaded) break;
            }
        } catch(e) {}
    }

    if (!loaded) {
        const local = localStorage.getItem(`base_tt_teacher_${uid}_${tName}`) || localStorage.getItem(`base_tt_teacher_${tName}`);
        loaded = parseMatrixData(local) || Array(7).fill().map(() => Array(5).fill(""));
    }

    currentTeacherBaseTimetable = loaded;
    renderBaseTimetableInputGrid(currentTeacherBaseTimetable);
}

// 🎯 특정 학급의 시간표를 DB에서 불러와 모달 입력창에 채우기
async function fetchAndFillClassBase(gr, cl) {
    const uid = officeState.userId;
    const classKey = `${gr}-${cl}`;
    const keys = [`${uid}_class_${gr}_${cl}`, `class_${gr}_${cl}`];
    let loaded = null;

    for (const key of keys) {
        try {
            const snap = await getDoc(doc(db, "base_timetables", key));
            if (snap.exists()) {
                const d = snap.data();
                loaded = parseMatrixData(d.matrixJson || d.matrix || d.table);
                if (loaded) break;
            }
        } catch(e) {}
    }

    if (!loaded) {
        const local = localStorage.getItem(`base_tt_class_${uid}_${classKey}`) || localStorage.getItem(`base_tt_class_${classKey}`);
        loaded = parseMatrixData(local) || Array(7).fill().map(() => Array(5).fill(""));
    }

    currentClassBaseTimetable = loaded;
    renderBaseTimetableInputGrid(currentClassBaseTimetable);
}

// 🎯 교사명 직접 입력 모달
function openTeacherInputModal(callback = null) {
    const modal = document.getElementById('teacherSelectModal');
    const container = document.getElementById('modalTeacherList');
    if (!modal || !container) return;

    modal.style.zIndex = '60'; // 기본시간표 모달보다 위에 뜨도록 설정

    container.className = "flex flex-col gap-3 p-2";
    container.innerHTML = `
        <label class="text-xs text-slate-500 font-bold">시간표를 조회/설정할 교사 성함을 입력하세요</label>
        <div class="flex gap-2">
            <input type="text" id="teacherDirectInput" value="${officeState.teacherName}" placeholder="예: 신정훈" class="flex-1 text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-400 outline-none font-bold">
            <button id="teacherDirectConfirmBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors">확인</button>
        </div>
    `;
    
    const inputEl = document.getElementById('teacherDirectInput');
    const confirmBtn = document.getElementById('teacherDirectConfirmBtn');

    const applyTeacherName = async () => {
        const val = inputEl.value.trim();
        if (val) {
            modal.classList.add('hidden');
            modal.style.zIndex = '';
            
            if (callback) {
                await callback(val);
            } else {
                officeState.teacherName = val;
                localStorage.setItem('office_teacher_name', val);
                document.getElementById('titleTeacherNameBtn').textContent = val;
                
                try {
                    await setDoc(doc(db, "app_settings", `${officeState.userId}_office_profile`), {
                        userId: officeState.userId,
                        teacherName: val,
                        grade: officeState.selectedGrade,
                        classNum: officeState.selectedClassNum,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                } catch(e) {}
                
                loadAllTimetables();
            }
        }
    };

    confirmBtn.onclick = applyTeacherName;
    inputEl.onkeydown = (e) => { if (e.key === 'Enter') applyTeacherName(); };

    modal.classList.remove('hidden');
    inputEl.focus();
}

function renderBaseTimetableInputGrid(dataMatrix) {
    const tbody = document.getElementById('baseTimetableInputBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (let r = 0; r < 7; r++) {
        const tr = document.createElement('tr');
        let html = `<td class="py-2 border-r border-slate-200 font-bold bg-slate-50">${r + 1}교시</td>`;
        for (let c = 0; c < 5; c++) {
            const val = (dataMatrix && dataMatrix[r] && dataMatrix[r][c]) ? dataMatrix[r][c] : '';
            html += `<td class="p-1 border-r border-slate-200"><input type="text" id="baseInput_${r}_${c}" value="${val}" class="w-full text-center text-xs p-1.5 rounded bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-400 outline-none font-bold"></td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 🎯 스마트 시간표 로드 함수 (Firestore 및 로컬 복구 연동)
async function loadAllTimetables() {
    const weekKey = officeState.isNextWeek ? 'next' : 'this';
    const uid = officeState.userId;
    const tName = officeState.teacherName;
    const gr = officeState.selectedGrade;
    const cl = officeState.selectedClassNum;

    let loadedTeacherBase = null;
    const tDocKeys = [
        `${uid}_teacher_${tName}`,
        `teacher_${tName}`
    ];

    for (const key of tDocKeys) {
        try {
            const snap = await getDoc(doc(db, "base_timetables", key));
            if (snap.exists()) {
                const d = snap.data();
                loadedTeacherBase = parseMatrixData(d.matrixJson || d.matrix || d.table);
                if (loadedTeacherBase) break;
            }
        } catch(e) {}
    }

    if (loadedTeacherBase) {
        currentTeacherBaseTimetable = loadedTeacherBase;
        localStorage.setItem(`base_tt_teacher_${uid}_${tName}`, JSON.stringify(loadedTeacherBase));
        localStorage.setItem(`base_tt_teacher_${tName}`, JSON.stringify(loadedTeacherBase));
    } else {
        const localT = localStorage.getItem(`base_tt_teacher_${uid}_${tName}`) || localStorage.getItem(`base_tt_teacher_${tName}`);
        const parsedLocal = parseMatrixData(localT);
        currentTeacherBaseTimetable = parsedLocal || Array(7).fill().map(() => Array(5).fill(""));

        // 🎯 PC 캐시에만 데이터가 있고 DB가 비어있는 경우, DB로 자동 구출 전송 (모바일 즉시 연동)
        if (parsedLocal && !isMatrixEmpty(parsedLocal)) {
            const matrixStr = JSON.stringify(parsedLocal);
            setDoc(doc(db, "base_timetables", `teacher_${tName}`), {
                userId: uid,
                teacherName: tName,
                matrix: matrixStr,
                matrixJson: matrixStr,
                updatedAt: new Date().toISOString()
            }).catch(() => {});
        }
    }

    let loadedClassBase = null;
    const classKey = `${gr}-${cl}`;
    const cDocKeys = [
        `${uid}_class_${gr}_${cl}`,
        `class_${gr}_${cl}`
    ];

    for (const key of cDocKeys) {
        try {
            const snap = await getDoc(doc(db, "base_timetables", key));
            if (snap.exists()) {
                const d = snap.data();
                loadedClassBase = parseMatrixData(d.matrixJson || d.matrix || d.table);
                if (loadedClassBase) break;
            }
        } catch(e) {}
    }

    if (loadedClassBase) {
        currentClassBaseTimetable = loadedClassBase;
        localStorage.setItem(`base_tt_class_${uid}_${classKey}`, JSON.stringify(loadedClassBase));
        localStorage.setItem(`base_tt_class_${classKey}`, JSON.stringify(loadedClassBase));
    } else {
        const localC = localStorage.getItem(`base_tt_class_${uid}_${classKey}`) || localStorage.getItem(`base_tt_class_${classKey}`);
        const parsedLocalC = parseMatrixData(localC);
        currentClassBaseTimetable = parsedLocalC || Array(7).fill().map(() => Array(5).fill(""));

        // 학급 데이터도 DB로 자동 구출 전송
        if (parsedLocalC && !isMatrixEmpty(parsedLocalC)) {
            const matrixStr = JSON.stringify(parsedLocalC);
            setDoc(doc(db, "base_timetables", `class_${gr}_${cl}`), {
                userId: uid,
                grade: gr,
                classNum: cl,
                matrix: matrixStr,
                matrixJson: matrixStr,
                updatedAt: new Date().toISOString()
            }).catch(() => {});
        }
    }

    let teacherScheduleMap = null;
    const namePrefix = tName.substring(0, 2);
    const tKeysToTry = [namePrefix, tName];
    if (namePrefix === '신정' || tName.includes('정훈')) tKeysToTry.push('32');

    for (const key of tKeysToTry) {
        try {
            const snap = await getDoc(doc(db, "timetable_schedules", `tt_teacher_${weekKey}_${key}`));
            if (snap.exists() && snap.data().schedule) {
                teacherScheduleMap = snap.data().schedule;
                break;
            }
        } catch(e) {}
    }

    let classScheduleMap = null;
    try {
        const snap = await getDoc(doc(db, "timetable_schedules", `tt_class_${weekKey}_${classKey}`));
        if (snap.exists() && snap.data().schedule) {
            classScheduleMap = snap.data().schedule;
        }
    } catch(e) {}

    renderTeacherGrid(teacherScheduleMap);
    renderClassGrid(classScheduleMap);
}

// 교사 시간표 렌더링
function renderTeacherGrid(scheduleMap) {
    const tbody = document.getElementById('teacherTimetableGridBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    for (let period = 1; period <= 7; period++) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition-colors";
        let html = `<td class="py-3.5 sm:py-4 border-r border-slate-200 font-bold bg-slate-50 text-slate-700">${period}교시</td>`;
        
        for (let day = 0; day < 5; day++) {
            const cellKey = `${period}_${day}`;
            const item = scheduleMap ? scheduleMap[cellKey] : null;
            
            let text = "";
            let isRed = false;
            
            if (item) {
                text = typeof item === 'object' ? (item.text || "") : String(item);
                isRed = typeof item === 'object' && item.type === 'red';
            }
            
            const baseText = currentTeacherBaseTimetable[period - 1][day] || "";
            const cleanBase = baseText.trim().replace(/\s+/g, '');
            const cleanText = text.trim().replace(/\s+/g, '');
            
            const isMint = eventKeywords.some(k => cleanText.includes(k));

            let isChanged = false;
            if (!isMint) {
                if (cleanBase !== cleanText) {
                    isChanged = true;
                } else if (isRed) {
                    isChanged = true;
                }
            }

            let bgStyle = "";
            if (isMint) bgStyle = "background-color: #6ee7b7 !important;";
            else if (isChanged) bgStyle = "background-color: #d8b4fe !important;";

            html += `<td class="py-3.5 sm:py-4 border-r border-slate-200 font-bold text-center text-indigo-900" style="${bgStyle}">
                        ${text || '-'}
                     </td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 학급 시간표 렌더링
function renderClassGrid(scheduleMap) {
    const tbody = document.getElementById('classTimetableGridBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    for (let period = 1; period <= 7; period++) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition-colors";
        let html = `<td class="py-3.5 sm:py-4 border-r border-slate-200 font-bold bg-slate-50 text-slate-700">${period}교시</td>`;
        
        for (let day = 0; day < 5; day++) {
            const cellKey = `${period}_${day}`;
            const item = scheduleMap ? scheduleMap[cellKey] : null;
            
            let text = "";
            let isRed = false;
            
            if (item) {
                text = typeof item === 'object' ? (item.text || "") : String(item);
                isRed = typeof item === 'object' && item.type === 'red';
            }
            
            const baseText = currentClassBaseTimetable[period - 1][day] || "";
            const cleanBase = baseText.trim().replace(/\s+/g, '');
            const cleanText = text.trim().replace(/\s+/g, '');

            const isMint = eventKeywords.some(k => cleanText.includes(k));

            let isSubjectMatch = false;
            if (cleanBase !== "" && cleanText !== "") {
                const baseSub = cleanBase.length >= 2 ? cleanBase.substring(0, 2) : cleanBase;
                const textSub = cleanText.length >= 2 ? cleanText.substring(0, 2) : cleanText;
                isSubjectMatch = (baseSub === textSub) || cleanText.startsWith(cleanBase);
            }

            let isChanged = false;
            if (!isMint) {
                if (cleanBase !== "" && cleanText !== "") {
                    isChanged = !isSubjectMatch;
                } else if (cleanBase === "" && cleanText !== "") {
                    isChanged = true; 
                } else if (cleanBase !== "" && cleanText === "") {
                    isChanged = true; 
                } else {
                    isChanged = isRed;
                }
            }

            let bgStyle = "";
            if (isMint) bgStyle = "background-color: #6ee7b7 !important;";
            else if (isChanged) bgStyle = "background-color: #d8b4fe !important;";

            html += `<td class="py-3.5 sm:py-4 border-r border-slate-200 font-bold text-center text-sky-900" style="${bgStyle}">
                        ${text || '-'}
                     </td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 나이스 급식 조회 함수 
async function fetchMeal() {
    const dateInput = document.getElementById('mealDateInput');
    const listDiv = document.getElementById('mealDishList');
    if (!listDiv) return;

    if (!dateInput || !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        if (dateInput) dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    const targetDate = dateInput ? dateInput.value : '';
    if (!targetDate) return;

    listDiv.innerHTML = `<div class="flex items-center gap-2 text-slate-400 py-2"><i class="fa-solid fa-spinner fa-spin text-amber-500"></i> 급식 정보 조회 중...</div>`;
    const dateStr = targetDate.replace(/-/g, '');

    const officeCode = 'E10'; 
    const schoolCode = '7331057'; 

    const reqUrls = [
        `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${dateStr}&KEY=4095db6a1ff547ecae2ce3dbf074d9e9`,
        `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${dateStr}`
    ];

    let data = null;
    for (const url of reqUrls) {
        try {
            const res = await fetch(url);
            const json = await res.json();
            if (json.mealServiceDietInfo || json.RESULT?.CODE === 'INFO-200') {
                data = json;
                break;
            }
        } catch (e) {}
    }

    if (data && data.mealServiceDietInfo && data.mealServiceDietInfo[1]?.row?.length > 0) {
        const rows = data.mealServiceDietInfo[1].row;
        const lunch = rows.find(r => r.MMEAL_SC_NM === '중식' || r.MMEAL_SC_CODE === '2') || rows[0];
        
        if (lunch && lunch.DDISH_NM) {
            let mealStr = lunch.DDISH_NM;
            mealStr = mealStr.replace(/<br\s*\/?>/gi, '\n');
            mealStr = mealStr.replace(/\([0-9\.\s]+\)/g, '');
            mealStr = mealStr.split('\n').map(item => item.trim()).filter(Boolean).join('\n');
            
            listDiv.innerHTML = mealStr || "식단 정보가 비어있습니다.";
            return;
        }
    }

    if (data && data.RESULT && data.RESULT.CODE === 'INFO-200') {
        listDiv.innerHTML = `<span class="text-slate-400 font-medium leading-relaxed">해당 날짜(${targetDate})는 등록된 급식이 없습니다.<br><span class="text-[11px] text-amber-600 font-normal">※ 주말, 휴업일 또는 식단 미등록일입니다.</span></span>`;
    } else {
        listDiv.innerHTML = `<span class="text-slate-400 font-medium">해당 날짜의 급식 정보가 없습니다.</span>`;
    }
}
