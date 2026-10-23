import { db, doc, getDoc, setDoc } from './firebase-config.js';

export const teacherList = [
    { name: "곽경애", short: "경애" }, { name: "권수영", short: "수영" }, { name: "김미래", short: "미래" },
    { name: "김영희", short: "영희" }, { name: "김지민", short: "지민" }, { name: "노현아", short: "현아" },
    { name: "문정식", short: "정식" }, { name: "박정민", short: "정민" }, { name: "박현주", short: "현주" },
    { name: "성영은", short: "성영" }, { name: "신정훈", short: "정훈" }, { name: "심지수", short: "지수" },
    { name: "오혜선", short: "혜선" }, { name: "이명화", short: "명화" }, { name: "이윤수", short: "윤수" },
    { name: "이종민", short: "종민" }, { name: "임효진", short: "효진" }, { name: "장민지", short: "민지" },
    { name: "정다은", short: "다은" }, { name: "조수아", short: "수아" }, { name: "최진희", short: "진희" },
    { name: "하서영", short: "서영" }, { name: "한민주", short: "한민" }, { name: "황지수", short: "황지" }
];

export let officeState = {
    selectedTeacher: teacherList.find(t => t.short === "정훈"),
    selectedGrade: 1,
    selectedClassNum: 7,
    isNextWeek: false
};

let currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
let activeBaseModalType = null; 

// 이벤트(민트색) 과목 키워드
const eventKeywords = ['자치', '동아', '봉사', '진로'];

export function initOfficeTab(currentUser) {
    if (!currentUser) return;
    
    // 교사 선택 모달
    document.getElementById('titleTeacherNameBtn')?.addEventListener('click', () => {
        const container = document.getElementById('modalTeacherList');
        container.innerHTML = '';
        teacherList.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `p-2 rounded-xl border text-center font-bold transition-colors ${officeState.selectedTeacher.short === t.short ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`;
            btn.textContent = t.name;
            btn.onclick = () => {
                officeState.selectedTeacher = t;
                document.getElementById('titleTeacherNameBtn').textContent = t.name;
                document.getElementById('teacherSelectModal').classList.add('hidden');
                loadAllTimetables();
            };
            container.appendChild(btn);
        });
        document.getElementById('teacherSelectModal').classList.remove('hidden');
    });
    
    document.getElementById('closeTeacherSelectModalBtn')?.addEventListener('click', () => document.getElementById('teacherSelectModal').classList.add('hidden'));

    // 학급 선택 모달
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

    // 기본 시간표 설정 모달 연결
    const baseModal = document.getElementById('baseTimetableModal');
    
    document.getElementById('openTeacherBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'teacher';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.selectedTeacher.name} 교사 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 108정보";
        renderBaseTimetableInputGrid(currentTeacherBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('openClassBaseBtn')?.addEventListener('click', () => {
        activeBaseModalType = 'class';
        document.getElementById('baseTimetableModalTitle').textContent = `${officeState.selectedGrade}-${officeState.selectedClassNum} 학급 기본 시간표 설정`;
        document.getElementById('baseTimetableModalDesc').textContent = "입력 예시: 정보32";
        renderBaseTimetableInputGrid(currentClassBaseTimetable);
        baseModal.classList.remove('hidden');
    });

    document.getElementById('closeBaseTimetableModalBtn')?.addEventListener('click', () => baseModal.classList.add('hidden'));

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
                await setDoc(doc(db, "base_timetables", `teacher_${officeState.selectedTeacher.short}`), { matrix: newData });
                currentTeacherBaseTimetable = newData;
            } else {
                await setDoc(doc(db, "base_timetables", `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`), { matrix: newData });
                currentClassBaseTimetable = newData;
            }
            alert("✅ 기본 시간표가 저장되었습니다.");
            baseModal.classList.add('hidden');
            loadAllTimetables();
        } catch (e) {
            alert("저장 중 오류가 발생했습니다.");
        }
    });

    // 이번 주 / 다음 주 토글 버튼
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

    // 급식 조회
    const mealDateInput = document.getElementById('mealDateInput');
    const fetchMealBtn = document.getElementById('fetchMealBtn');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (mealDateInput) mealDateInput.value = `${yyyy}-${mm}-${dd}`;
    
    fetchMealBtn?.addEventListener('click', fetchMeal);
    
    document.getElementById('titleTeacherNameBtn').textContent = officeState.selectedTeacher.name;
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
            html += `<td class="p-1 border-r border-slate-200"><input type="text" id="baseInput_${r}_${c}" value="${dataMatrix[r][c] || ''}" class="w-full text-center text-xs p-1.5 rounded bg-white border border-slate-300 focus:ring-1 focus:ring-indigo-400 outline-none"></td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

// 🎯 파이어베이스 timetable_schedules 컬렉션에서 데이터 로드
async function loadAllTimetables() {
    const weekKey = officeState.isNextWeek ? 'next' : 'this';

    // 1. 기본 시간표 가져오기
    try {
        const tSnap = await getDoc(doc(db, "base_timetables", `teacher_${officeState.selectedTeacher.short}`));
        currentTeacherBaseTimetable = tSnap.exists() && tSnap.data().matrix ? tSnap.data().matrix : Array(7).fill().map(() => Array(5).fill(""));

        const cSnap = await getDoc(doc(db, "base_timetables", `class_${officeState.selectedGrade}_${officeState.selectedClassNum}`));
        currentClassBaseTimetable = cSnap.exists() && cSnap.data().matrix ? cSnap.data().matrix : Array(7).fill().map(() => Array(5).fill(""));
    } catch(e) {
        currentTeacherBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
        currentClassBaseTimetable = Array(7).fill().map(() => Array(5).fill(""));
    }

    // 2. 깃허브 액션이 저장해 둔 교사 시간표 가져오기
    let teacherScheduleMap = null;
    const teacherDocCandidates = [
        officeState.selectedTeacher.name.substring(0, 2), // '신정'
        officeState.selectedTeacher.short,                // '정훈'
        officeState.selectedTeacher.name                  // '신정훈'
    ];
    if (officeState.selectedTeacher.short === '정훈' || officeState.selectedTeacher.name === '신정훈') {
        teacherDocCandidates.push('32');
    }

    for (const key of teacherDocCandidates) {
        try {
            const snap = await getDoc(doc(db, "timetable_schedules", `tt_teacher_${weekKey}_${key}`));
            if (snap.exists() && snap.data().schedule) {
                teacherScheduleMap = snap.data().schedule;
                break;
            }
        } catch(e) {}
    }

    // 3. 깃허브 액션이 저장해 둔 학급 시간표 가져오기
    let classScheduleMap = null;
    try {
        const classDocKey = `tt_class_${weekKey}_${officeState.selectedGrade}-${officeState.selectedClassNum}`;
        const snap = await getDoc(doc(db, "timetable_schedules", classDocKey));
        if (snap.exists() && snap.data().schedule) {
            classScheduleMap = snap.data().schedule;
        }
    } catch(e) {}

    // 4. 화면 렌더링
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
        tr.className = "hover:bg-slate-50 transition-colors";
        let html = `<td class="py-3 sm:py-4 border-r border-slate-200 font-bold bg-slate-50">${period}교시</td>`;
        
        for (let day = 0; day < 5; day++) {
            const cellKey = `${period}_${day}`;
            const item = scheduleMap ? scheduleMap[cellKey] : null;
            
            let info = "";
            let cellClass = "";
            
            if (item) {
                const text = typeof item === 'object' ? (item.text || "") : String(item);
                const isRed = typeof item === 'object' && item.type === 'red';
                const baseText = currentTeacherBaseTimetable[period - 1][day];
                
                // 이벤트(민트색) 확인
                const isMint = eventKeywords.some(k => text.includes(k));
                // 변경(보라색) 확인: 기본 시간표와 다르거나 수집 로봇이 red로 판별한 경우
                const isChanged = !isMint && ((baseText && baseText !== text) || isRed);

                if (isMint) cellClass = 'bg-[#d1fae5] text-[#047857]';
                else if (isChanged) cellClass = 'bg-[#d8b4fe] text-white';

                info = `<div class="h-full flex flex-col items-center justify-center py-2 ${cellClass} rounded-sm">
                            <span>${text}</span>
                        </div>`;
            } else {
                // 데이터가 없을 때 기본 시간표가 등록되어 있다면 표시
                const fallbackText = currentTeacherBaseTimetable[period - 1][day];
                if (fallbackText) info = `<span>${fallbackText}</span>`;
            }
            
            html += `<td class="border-r border-slate-200 font-bold ${info ? 'text-indigo-700 p-0' : 'text-slate-300'}">${info || '-'}</td>`;
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
        tr.className = "hover:bg-slate-50 transition-colors";
        let html = `<td class="py-3 sm:py-4 border-r border-slate-200 font-bold bg-slate-50">${period}교시</td>`;
        
        for (let day = 0; day < 5; day++) {
            const cellKey = `${period}_${day}`;
            const item = scheduleMap ? scheduleMap[cellKey] : null;
            
            let info = "";
            let cellClass = "";
            
            if (item) {
                const text = typeof item === 'object' ? (item.text || "") : String(item);
                const isRed = typeof item === 'object' && item.type === 'red';
                const baseText = currentClassBaseTimetable[period - 1][day];
                
                // 이벤트(민트색) 확인
                const isMint = eventKeywords.some(k => text.includes(k));
                // 변경(보라색) 확인: 기본 시간표와 다르거나 수집 로봇이 red로 판별한 경우
                const isChanged = !isMint && ((baseText && baseText !== text) || isRed);

                if (isMint) cellClass = 'bg-[#d1fae5] text-[#047857]';
                else if (isChanged) cellClass = 'bg-[#d8b4fe] text-white';

                info = `<div class="h-full flex flex-col items-center justify-center py-2 ${cellClass} rounded-sm">
                            <span>${text}</span>
                        </div>`;
            } else {
                // 데이터가 없을 때 기본 시간표가 등록되어 있다면 표시
                const fallbackText = currentClassBaseTimetable[period - 1][day];
                if (fallbackText) info = `<span>${fallbackText}</span>`;
            }
            
            html += `<td class="border-r border-slate-200 font-bold ${info ? 'text-sky-700 p-0' : 'text-slate-300'}">${info || '-'}</td>`;
        }
        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

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
        
        if (data.mealServiceDietInfo && data.mealServiceDietInfo[1].row.length > 0) {
            let mealStr = data.mealServiceDietInfo[1].row[0].DDISH_NM;
            mealStr = mealStr.replace(/<br\/>/g, '\n').replace(/\([^)]*\)/g, '').replace(/[^가-힣a-zA-Z0-9\s]/g, '');
            listDiv.innerHTML = mealStr;
        } else {
            listDiv.innerHTML = "해당 날짜의 급식 정보가 없습니다.";
        }
    } catch(e) {
        listDiv.innerHTML = "급식 정보를 불러오는 중 오류가 발생했습니다.";
    }
}
