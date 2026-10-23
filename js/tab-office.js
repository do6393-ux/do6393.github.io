import { db, doc, getDoc, setDoc } from './firebase-config.js';

// 기존 main.js와의 호환성을 위한 빈 배열 내보내기 (하드코딩 제거)
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
    selectedGrade: 1,
    selectedClassNum: 7,
    isNextWeek: false
};

// 동적으로 관리되는 기본 시간표 (더미데이터 완전 제거)
let currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let activeBaseModalType = null; 

// 이벤트(민트색) 과목 키워드
const eventKeywords = ['자치', '동아', '봉사', '진로'];

export function initOfficeTab(currentUser) {
    if (!currentUser) return;
    
    // 🎯 1. 교사 이름 직접 입력 모달 (더미 목록 대신 직접 텍스트 입력)
    document.getElementById('titleTeacherNameBtn')?.addEventListener('click', () => {
        const container = document.getElementById('modalTeacherList');
        container.className = "flex flex-col gap-3 p-2";
        container.innerHTML = `
            <label class="text-xs text-slate-500 font-bold">시간표를 조회할 교사 이름을 입력하세요</label>
            <div class="flex gap-2">
                <input type="text" id="teacherDirectInput" value="${officeState.teacherName}" placeholder="예: 신정훈" class="flex-1 text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-400 outline-none font-bold">
                <button id="teacherDirectConfirmBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors">확인</button>
            </div>
        `;
        
        const inputEl = document.getElementById('teacherDirectInput');
        const confirmBtn = document.getElementById('teacherDirectConfirmBtn');

        const applyTeacherName = () => {
            const val = inputEl.value.trim();
            if (val) {
                officeState.teacherName = val;
                localStorage.setItem('office_teacher_name', val);
                document.getElementById('titleTeacherNameBtn').textContent = val;
                document.getElementById('teacherSelectModal').classList.add('hidden');
                loadAllTimetables();
            }
        };

        confirmBtn.onclick = applyTeacherName;
        inputEl.onkeydown = (e) => { if (e.key === 'Enter') applyTeacherName(); };

        document.getElementById('teacherSelectModal').classList.remove('hidden');
        inputEl.focus();
    });
    
    document.getElementById('closeTeacherSelectModalBtn')?.addEventListener('click', () => document.getElementById('teacherSelectModal').classList.add('hidden'));

    // 학급 선택 모달 (1~3학년, 1~10반 동적 생성)
    document.getElementById('titleClassNameBtn')?.addEventListener('click', () => {
        const container = document.getElementById('modalClassList');
        container.innerHTML = '';
        for (let g = 1; g <= 3; g++) {
            for (let c = 1; c <= 10; c++) {
                const btn = document.createElement('button');
                btn.className = `p-2 rounded-xl border text-center font-bold transition-colors ${(officeState.selectedGrade === g && officeState.selectedClassNum === c) ? 'bg-sky-50 text-sky-700 border-sky-200' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`;
                btn.textContent = `${g}-${c}`;
                btn.onclick = () => {
                    officeState.selectedGrade = g;
                    officeState.selectedClassNum = c;
                    document.getElementById('titleClassNameBtn').textContent = `${g}-${c}`;
                    document.getElementById('classSelectModal').classList.add('hidden');
                    loadAllTimetables();
                };
                container.appendChild(btn);
            }
        }
        document.getElementById('classSelectModal').classList.remove('hidden');
    });
    
    document.getElementById('closeClassSelectModalBtn')?.addEventListener('click', () => document.getElementById('classSelectModal').classList.add('hidden'));

    // 🎯 2. 기본 시간표 설정 모달 연결
    const baseModal = document.getElementById('baseTimetableModal');
    
    document.getElementById('openTeacherBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'teacher';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.teacherName} 교사 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 108정보";
        renderBaseTimetableInputGrid(currentTeacherBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('openClassBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'class';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum} 학급 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 체육34";
        renderBaseTimetableInputGrid(currentClassBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('closeBaseTimetableModalBtn')?.addEventListener('click', () => baseModal.classList.add('hidden'));

    // 기본 시간표 저장 (모달에서 입력한 값 영구 보관)
    document.getElementById('saveBaseTimetableBtn')?.addEventListener('click', async () => {
        const newData = Array(7).fill().map(() => Array(5).fill(""));
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 5; c++) {
                const val = document.getElementById(`baseInput_${r}_${c}`).value.trim();
                newData[r][c] = val;
            }
        }

        if (activeBaseModalType === 'teacher') {
            currentTeacherBaseTimetable = newData;
            localStorage.setItem(`base_tt_teacher_${officeState.teacherName}`, JSON.stringify(newData));
            try { await setDoc(doc(db, "base_timetables", `teacher_${officeState.teacherName}`), { matrix: newData }); } catch(e){}
        } else {
            currentClassBaseTimetable = newData;
            const classKey = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
            localStorage.setItem(`base_tt_class_${classKey}`, JSON.stringify(newData));
            try { await setDoc(doc(db, "base_timetables", `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`), { matrix: newData }); } catch(e){}
        }
        
        alert("✅ 기본 시간표가 저장되었습니다.");
        baseModal.classList.add('hidden');
        loadAllTimetables();
    });

    // 이번 주 / 다음 주 토글
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

    // 급식 날짜 세팅 및 조회
    const mealDateInput = document.getElementById('mealDateInput');
    const fetchMealBtn = document.getElementById('fetchMealBtn');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (mealDateInput && !mealDateInput.value) mealDateInput.value = `${yyyy}-${mm}-${dd}`;
    
    fetchMealBtn?.addEventListener('click', fetchMeal);
    
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

// 🎯 3. 시간표 데이터 로드 (순수 사용자 입력 기본값 + Firestore 연동)
async function loadAllTimetables() {
    const weekKey = officeState.isNextWeek ? 'next' : 'this';

    // 1) 등록된 교사 기본 시간표 로드 (로컬스토리지 -> Firestore)
    const localT = localStorage.getItem(`base_tt_teacher_${officeState.teacherName}`);
    if (localT) {
        currentTeacherBaseTimetable = JSON.parse(localT);
    } else {
        try {
            const tSnap = await getDoc(doc(db, "base_timetables", `teacher_${officeState.teacherName}`));
            currentTeacherBaseTimetable = (tSnap.exists() && tSnap.data().matrix) ? tSnap.data().matrix : Array(7).fill().map(() => Array(5).fill(""));
        } catch(e) {
            currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
        }
    }

    // 2) 등록된 학급 기본 시간표 로드
    const classKey = `${officeState.selectedGrade}-${officeState.selectedClassNum}`;
    const localC = localStorage.getItem(`base_tt_class_${classKey}`);
    if (localC) {
        currentClassBaseTimetable = JSON.parse(localC);
    } else {
        try {
            const cSnap = await getDoc(doc(db, "base_timetables", `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`));
            currentClassBaseTimetable = (cSnap.exists() && cSnap.data().matrix) ? cSnap.data().matrix : Array(7).fill().map(() => Array(5).fill(""));
        } catch(e) {
            currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
        }
    }

    // 3) Firestore에서 교사 시간표 로드 (입력한 이름의 앞 2글자 및 풀네임 자동 매칭)
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

    // 4) Firestore에서 학급 시간표 로드
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

// 🎯 4. 교사 시간표 렌더링 (민트/보라 꽉 채움 + 선명한 폰트)
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
                        ${text || (baseText ? `<span class="opacity-40">${baseText}</span>` : '-')}
                     </td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 🎯 5. 학급 시간표 렌더링 (민트/보라 꽉 채움 + 선명한 폰트)
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
            // 2순위: 보라색 (기본 시간표와 다른 수업이거나 컴시간 red인 경우)
            const isChanged = !isMint && ((baseText !== "" && text !== "" && baseText !== text) || isRed);

            let bgStyle = "";
            if (isMint) bgStyle = "background-color: #6ee7b7 !important;";
            else if (isChanged) bgStyle = "background-color: #d8b4fe !important;";

            html += `<td class="py-3.5 sm:py-4 border-r border-slate-200 font-bold text-center text-sky-900" style="${bgStyle}">
                        ${text || (baseText ? `<span class="opacity-40">${baseText}</span>` : '-')}
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
