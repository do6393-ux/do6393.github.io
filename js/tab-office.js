import { db, doc, getDoc, setDoc } from './firebase-config.js';

// 기존 모듈 호환성을 위한 export
export const teacherList = [];

export let officeState = {
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

export async function initOfficeTab(currentUser) {
    if (!currentUser) return;
    
    // 🎯 1. 파이어베이스 DB에서 저장된 기본 설정(교사명, 학급) 불러오기
    try {
        const settingSnap = await getDoc(doc(db, "app_settings", "office_profile"));
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
        }
    } catch (e) {
        console.warn("파이어베이스 설정 로드 실패 (로컬 데이터 유지):", e);
    }
    
    // 🎯 2. 교사 성함 클릭 시 직접 변경 팝업
    document.getElementById('titleTeacherNameBtn')?.addEventListener('click', () => {
        const container = document.getElementById('modalTeacherList');
        container.className = "flex flex-col gap-3 p-2";
        container.innerHTML = `
            <label class="text-xs text-slate-500 font-bold">시간표를 조회할 교사 성함을 입력하세요</label>
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
                officeState.teacherName = val;
                localStorage.setItem('office_teacher_name', val);
                document.getElementById('titleTeacherNameBtn').textContent = val;
                document.getElementById('teacherSelectModal').classList.add('hidden');
                
                // 파이어베이스 DB에 교사명 업데이트
                try {
                    await setDoc(doc(db, "app_settings", "office_profile"), {
                        teacherName: val,
                        grade: officeState.selectedGrade,
                        classNum: officeState.selectedClassNum,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                } catch(e) {}
                
                loadAllTimetables();
            }
        };

        confirmBtn.onclick = applyTeacherName;
        inputEl.onkeydown = (e) => { if (e.key === 'Enter') applyTeacherName(); };

        document.getElementById('teacherSelectModal').classList.remove('hidden');
        inputEl.focus();
    });
    
    document.getElementById('closeTeacherSelectModalBtn')?.addEventListener('click', () => document.getElementById('teacherSelectModal').classList.add('hidden'));

    // 🎯 3. 학급 선택 모달 (1~3학년, 1~10반)
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
                    
                    // 파이어베이스 DB에 학급 설정 동기화
                    try {
                        await setDoc(doc(db, "app_settings", "office_profile"), {
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

    // 🎯 4. 내 계정 설정 모달 (상단 ⚙️ 버튼) 연동
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

        // 파이어베이스 DB에 저장
        try {
            await setDoc(doc(db, "app_settings", "office_profile"), {
                teacherName: officeState.teacherName,
                grade: gr,
                classNum: cl,
                updatedAt: new Date().toISOString()
            });
            alert("✅ 설정이 파이어베이스 DB에 저장되었습니다.");
        } catch(e) {
            console.error("설정 DB 저장 실패:", e);
        }

        profileModal?.classList.add('hidden');
        loadAllTimetables();
    });

    // 🎯 5. 기본 시간표 설정 모달 연결
    const baseModal = document.getElementById('baseTimetableModal');
    
    document.getElementById('openTeacherBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'teacher';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.teacherName} 교사 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 108정보 (수정하기 전까지 파이어베이스 DB에 영구 유지됩니다)";
        renderBaseTimetableInputGrid(currentTeacherBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('openClassBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'class';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum} 학급 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 국어, 체육 (앞 2글자 교과목명만 일치하면 정상으로 인식합니다)";
        renderBaseTimetableInputGrid(currentClassBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('closeBaseTimetableModalBtn')?.addEventListener('click', () => baseModal.classList.add('hidden'));

    // 🎯 6. 기본 시간표 저장 (Firestore DB 저장 필수화)
    document.getElementById('saveBaseTimetableBtn')?.addEventListener('click', async () => {
        const newData = Array(7).fill().map(() => Array(5).fill(""));
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 5; c++) {
                const val = document.getElementById(`baseInput_${r}_${c}`).value.trim();
                newData[r][c] = val;
            }
        }

        try {
            if (activeBaseModalType === 'teacher') {
                currentTeacherBaseTimetable = newData;
                localStorage.setItem(`base_tt_teacher_${officeState.teacherName}`, JSON.stringify(newData));
                // Firestore 저장
                await setDoc(doc(db, "base_timetables", `teacher_${officeState.teacherName}`), {
                    teacherName: officeState.teacherName,
                    matrix: newData,
                    updatedAt: new Date().toISOString()
                });
            } else {
                currentClassBaseTimetable = newData;
                const classKey = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
                const classDocKey = `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`;
                localStorage.setItem(`base_tt_class_${classKey}`, JSON.stringify(newData));
                // Firestore 저장
                await setDoc(doc(db, "base_timetables", classDocKey), {
                    grade: officeState.selectedGrade,
                    classNum: officeState.selectedClassNum,
                    matrix: newData,
                    updatedAt: new Date().toISOString()
                });
            }
            alert("✅ 기본 시간표가 파이어베이스 DB에 안전하게 저장되었습니다.");
        } catch (e) {
            console.error("Firestore 기본 시간표 저장 에러:", e);
            alert("기본 시간표가 브라우저에 임시 저장되었습니다. (DB 권한 확인 필요)");
        }
        
        baseModal.classList.add('hidden');
        loadAllTimetables();
    });

    // 7. 이번 주 / 다음 주 전환 토글
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

    // 8. 급식 초기화
    const mealDateInput = document.getElementById('mealDateInput');
    const fetchMealBtn = document.getElementById('fetchMealBtn');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (mealDateInput && !mealDateInput.value) mealDateInput.value = `${yyyy}-${mm}-${dd}`;
    
    fetchMealBtn?.addEventListener('click', fetchMeal);
    
    // UI 타이틀 반영
    document.getElementById('titleTeacherNameBtn').textContent = officeState.teacherName;
    document.getElementById('titleClassNameBtn').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;

    loadAllTimetables();
    fetchMeal();
}

function renderBaseTimetableInputGrid(dataMatrix) {
    const tbody = document.getElementById('baseTimetableInputBody');
    tbody.innerHTML = '';
    for (let r = 0; r < 7; r++) {
        const tr = document.createElement('tr');
        let html = `<td class="py-2 border-r border-slate-200 font-bold bg-slate-50">${r + 1}교시</td>`;
        for (let c = 0; c < 5; c++) {
            html += `<td class="p-1 border-r border-slate-200"><input type="text" id="baseInput_${r}_${c}" value="${dataMatrix[r][c] || ''}" class="w-full text-center text-xs p-1.5 rounded bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-400 outline-none font-bold"></td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 🎯 파이어베이스 Firestore 우선 로드 함수
async function loadAllTimetables() {
    const weekKey = officeState.isNextWeek ? 'next' : 'this';

    // 1) 교사 기본 시간표 Firestore 조회 (DB 우선 -> 로컬 백업)
    try {
        const tSnap = await getDoc(doc(db, "base_timetables", `teacher_${officeState.teacherName}`));
        if (tSnap.exists() && tSnap.data().matrix) {
            currentTeacherBaseTimetable = tSnap.data().matrix;
            localStorage.setItem(`base_tt_teacher_${officeState.teacherName}`, JSON.stringify(currentTeacherBaseTimetable));
        } else {
            // DB에 없으면 로컬 스토리지 확인 후 DB로 자동 동기화
            const localT = localStorage.getItem(`base_tt_teacher_${officeState.teacherName}`);
            if (localT) {
                currentTeacherBaseTimetable = JSON.parse(localT);
                setDoc(doc(db, "base_timetables", `teacher_${officeState.teacherName}`), {
                    teacherName: officeState.teacherName,
                    matrix: currentTeacherBaseTimetable,
                    updatedAt: new Date().toISOString()
                }).catch(() => {});
            } else {
                currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
            }
        }
    } catch(e) {
        const localT = localStorage.getItem(`base_tt_teacher_${officeState.teacherName}`);
        currentTeacherBaseTimetable = localT ? JSON.parse(localT) : Array(7).fill().map(() => Array(5).fill(""));
    }

    // 2) 학급 기본 시간표 Firestore 조회 (DB 우선 -> 로컬 백업)
    const classKey = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
    const classDocKey = `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`;
    try {
        const cSnap = await getDoc(doc(db, "base_timetables", classDocKey));
        if (cSnap.exists() && cSnap.data().matrix) {
            currentClassBaseTimetable = cSnap.data().matrix;
            localStorage.setItem(`base_tt_class_${classKey}`, JSON.stringify(currentClassBaseTimetable));
        } else {
            const localC = localStorage.getItem(`base_tt_class_${classKey}`);
            if (localC) {
                currentClassBaseTimetable = JSON.parse(localC);
                setDoc(doc(db, "base_timetables", classDocKey), {
                    grade: officeState.selectedGrade,
                    classNum: officeState.selectedClassNum,
                    matrix: currentClassBaseTimetable,
                    updatedAt: new Date().toISOString()
                }).catch(() => {});
            } else {
                currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
            }
        }
    } catch(e) {
        const localC = localStorage.getItem(`base_tt_class_${classKey}`);
        currentClassBaseTimetable = localC ? JSON.parse(localC) : Array(7).fill().map(() => Array(5).fill(""));
    }

    // 3) Firestore에서 GitHub Actions가 수집한 교사 시간표 로드
    let teacherScheduleMap = null;
    const namePrefix = officeState.teacherName.substring(0, 2);
    const tKeysToTry = [namePrefix, officeState.teacherName];
    if (namePrefix === '신정' || officeState.teacherName.includes('정훈')) tKeysToTry.push('32');

    for (const key of tKeysToTry) {
        try {
            const snap = await getDoc(doc(db, "timetable_schedules", `tt_teacher_${weekKey}_${key}`));
            if (snap.exists() && snap.data().schedule) {
                teacherScheduleMap = snap.data().schedule;
                break;
            }
        } catch(e) {}
    }

    // 4) Firestore에서 GitHub Actions가 수집한 학급 시간표 로드
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

// 교사 시간표 렌더링 (배경 100% 꽉 채움, 잔상 표시 없음)
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
            
            const baseText = currentTeacherBaseTimetable[period - 1][day];
            
            // 1순위: 민트색 (자치, 동아, 봉사, 진로)
            const isMint = eventKeywords.some(k => text.includes(k));
            // 2순위: 보라색 (기본 시간표와 다른 수업이거나 컴시간 red인 경우)
            const isChanged = !isMint && ((baseText !== "" && text !== "" && baseText !== text) || isRed);

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

// 학급 시간표 렌더링 (교과목 앞 2글자 매칭 판별)
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
            
            const baseText = currentClassBaseTimetable[period - 1][day];
            
            // 1순위: 민트색 (자치, 동아, 봉사, 진로)
            const isMint = eventKeywords.some(k => text.includes(k));

            // 2순위: 앞 2글자 교과목명 일치 여부 판별
            let isSubjectMatch = false;
            const cleanBase = (baseText || "").trim().replace(/\s+/g, '');
            const cleanText = (text || "").trim().replace(/\s+/g, '');

            if (cleanBase !== "" && cleanText !== "") {
                const baseSub = cleanBase.length >= 2 ? cleanBase.substring(0, 2) : cleanBase;
                const textSub = cleanText.length >= 2 ? cleanText.substring(0, 2) : cleanText;
                isSubjectMatch = (baseSub === textSub) || cleanText.startsWith(cleanBase);
            }

            // 앞 2글자가 일치하면 보라색(변경)으로 변하지 않음
            let isChanged = false;
            if (!isMint) {
                if (cleanBase !== "" && cleanText !== "") {
                    isChanged = !isSubjectMatch;
                } else if (cleanBase === "" && cleanText !== "") {
                    isChanged = isRed;
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
    const dateInput = document.getElementById('mealDateInput').value;
    const listDiv = document.getElementById('mealDishList');
    if(!dateInput || !listDiv) return;
    
    listDiv.innerHTML = "데이터 조회 중...";
    const dateStr = dateInput.replace(/-/g, '');
    const ATPT_OFCDC_SC_CODE = 'E10'; 
    const SD_SCHUL_CODE = '7331078';  

    try {
        const res = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=4095db6a1ff547ecae2ce3dbf074d9e9&Type=json&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${dateStr}`);
        const data = await res.json();
        
        if (data.mealServiceDietInfo && data.mealServiceDietInfo[1]?.row?.length > 0) {
            let mealStr = data.mealServiceDietInfo[1].row[0].DDISH_NM;
            mealStr = mealStr.replace(/<br\/>/g, '\n').replace(/\([^)]*\)/g, '').replace(/[^가-힣a-zA-Z0-9\s]/g, '');
            listDiv.innerHTML = mealStr;
        } else {
            listDiv.innerHTML = "해당 날짜의 급식 정보가 없습니다.";
        }
    } catch(e) {
        listDiv.innerHTML = "해당 날짜의 급식 정보가 없습니다.";
    }
}
